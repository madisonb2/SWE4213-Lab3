//AI Use Statement: ChatGPT was used to debug the RabbitMQ queue.
const amqp = require("amqplib");

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
    await channel.assertQueue("notifications", { durable: false });
    await channel.bindQueue("notifications", "appts");
    console.log("Connected to RabbitMQ")

    await channel.prefetch(1);

    channel.consume("notifications", async(msg) => {
        if (!msg) {
            console.log("no message");
            return;
        }
        const { patient_email, appointment_id, doctor_name, reason } = JSON.parse(msg.content.toString());
        console.log(`[Notification] Sending confirmation to ${patient_email}`);
        console.log(`Appointment ID : ${appointment_id}`);
        console.log(`Doctor : ${doctor_name}`);
        console.log(`Reason : ${reason}`);
        console.log(`Status: confirmed`);
        console.log("Patient notified.");
        channel.ack(msg);
    });
    
}

main().catch(console.error);