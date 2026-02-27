const express = require('express');

const app = express();
app.use(express.json());

const PORT = 5002;

const doctors = [
    {doctor_id: "D001", doctor_name: "Dr. Sarah Chen", specialty : "cardiology", slots_remaining: 5},
    {doctor_id: "D002", doctor_name : "Dr. Jane Doe", specialty : "family medicine", slots_remaining: 5},
    {doctor_id: "D003", doctor_name : "Dr. John Doe", specialty : "dermatology", slots_remaining: 5}
];

app.get("/health", (req, res) => {
    res.status(200).json({message: "Doctor service is running."});
})

app.get("/doctors", (req, res) => {
    res.json(doctors.map(({doctor_name, slots_remaining}) => ({doctor_name, slots_remaining})));
})

app.get("/doctors/:id", (req, res) => {
    const { id } = req.params;

    doctor = doctors.find(u => u.doctor_id === id);

    if (!doctor) {
        return res.status(404).json({error : "Doctor not found."});
    }
    res.json(doctor);
})

app.post("/doctors/:id/reserve", (req, res) => {
    const { id } = req.params;

    const { slots } = req.body;

    doctor = doctors.find(u => u.doctor_id === id);

    if (!doctor) {
        return res.status(404).json({reason: "Doctor not found"});
    }

    if (doctor.slots_remaining - slots < 0) {
        return res.status(409).json({succes: false, 
            reason: doctor.doctor_name + " has no available slots"});
    }

    doctor.slots_remaining = doctor.slots_remaining - slots;

    return res.status(200).json({success: true, 
        doctor_id: doctor.doctor_id, 
        doctor_name: doctor.doctor_name, 
        slots_remaining: doctor.slots_remaining});
})

app.listen(PORT, () => {
    console.log(`Doctor Service running on port ${PORT}`);
})