//AI Use Statement: ChatGPT was used to debug the RabbitMQ queue.

const amqp = require("amqplib");

const appointments = [];
let num_appointments = 0;

async function connectWithRetry(url, retries = 10, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await amqp.connect(url);
    } catch (err) {
      console.log(`RabbitMQ not ready, retrying (${i}/${retries})...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Could not connect to RabbitMQ after retries");
}

async function main() {
    const connection = await connectWithRetry(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertExchange("appts", "fanout", {durable: false});
    await channel.assertQueue("records", { durable: false });
    await channel.bindQueue("records", "appts");
    console.log("Connected to RabbitMQ")

    await channel.prefetch(1);

    channel.consume("records", async(msg) => {
        if (!msg) {
            console.log("no message");
            return;
        }
        const appointment = JSON.parse(msg.content.toString());
        appointments.push(appointment);
        num_appointments = num_appointments + 1;
        console.log(`[Records] New appointment logged - total on record: ${num_appointments}`);
        for (const appt of appointments) {
            console.log(`${appt.patient_name} -> ${appt.doctor_name} (${appt.reason}) at ${appt.timestamp}`);
        }

        console.log("Appointment recorded.");
        channel.ack(msg);
    });
    
}

main().catch(console.error);