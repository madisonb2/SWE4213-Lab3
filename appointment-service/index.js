//AI Use Statement: ChatGPT was used to debug the RabbitMQ queue.
const express = require('express');
const { randomUUID } = require("crypto");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

const PORT = 5001;
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:5002";

let channel;

async function connectWithRetry(url, retries = 10, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            return await(amqp.connect(url));
        }
        catch (err) {
            console.log(`RabbitMQ not ready, retrying (${i}/${retries})...`);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
    throw new Error("Could not connect to RabbitMQ after retries");
}

async function main() {
    const connection = await connectWithRetry(process.env.RABBITMQ_URL || "amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertExchange("appts", "fanout", {durable: false});
    console.log("Connected to RabbitMQ");

    app.listen(PORT, () => {
        console.log(`Application Service running on port ${PORT}`)
    })
}

main().catch(console.error);

app.post("/appointments", async (req, res) => {
    const { patient_name, patient_email, doctor_id, reason } = req.body;

    if (!patient_name || !patient_email || !doctor_id || !reason){
        return res.status(400).json({error: "Patient name, patient email, doctor ID, and reason are required."});
    }

    try {
        const response = await fetch(`${DOCTOR_SERVICE_URL}/doctors/${doctor_id}/reserve`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({slots: 1})
        });

        const body = await response.json();

        if (!response.ok) {
            return res.status(409).json({status: "rejected", reason: body.reason});
        }

        const appointment_id = randomUUID();
        const date = new Date();
        const timestamp = date.toISOString();

        channel.publish("appts", "", Buffer.from(JSON.stringify({
            appointment_id: appointment_id,
            patient_name: patient_name,
            patient_email: patient_email,
            doctor_id: doctor_id,
            doctor_name: body.doctor_name,
            reason: reason,
            timestamp: timestamp
        })));

        res.status(201).json({appointment_id: appointment_id, 
            status: "confirmed",
            message: "Your appointment with " + body.doctor_name + " has been booked. A confirmation email will be sent soon."
        })


    }
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Unable to reach doctor service'})
    }
}) 
