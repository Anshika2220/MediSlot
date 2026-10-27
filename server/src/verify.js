// server/src/verify.js
import { connectDB } from './config/db.js';
import { User, Doctor, Appointment } from './models/index.js';
import mongoose from 'mongoose';

async function verify() {
  await connectDB();

  console.log('\n================ MediSlot Database Verification ================');
  const userCount = await User.countDocuments();
  const doctorCount = await Doctor.countDocuments();
  const appointmentCount = await Appointment.countDocuments();

  console.log(`👤 Total Users:        ${userCount}`);
  console.log(`🩺 Total Doctors:      ${doctorCount}`);
  console.log(`📅 Total Appointments: ${appointmentCount}`);

  console.log('\n--- Seeded Doctors ---');
  const doctors = await Doctor.find({}, 'name specialty slotDuration weeklySchedule');
  doctors.forEach((doc, idx) => {
    const workingDays = doc.weeklySchedule.filter((d) => d.isWorking).length;
    console.log(
      `  ${idx + 1}. ${doc.name.padEnd(20)} | ${doc.specialty.padEnd(14)} | ${doc.slotDuration} min slots | ${workingDays} working days/week`
    );
  });

  console.log('\n--- Appointment Status Breakdown ---');
  const statusCounts = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  statusCounts.forEach((s) => {
    console.log(`  - ${s._id.padEnd(12)}: ${s.count}`);
  });

  console.log('\n--- Index & Concurrency Check ---');
  const indexes = await Appointment.collection.indexes();
  const concurrencyIndex = indexes.find(
    (i) => i.key && i.key.doctorId === 1 && i.key.slotStartTime === 1
  );

  if (concurrencyIndex && concurrencyIndex.unique) {
    console.log('  ✅ Compound unique index on { doctorId: 1, slotStartTime: 1 } is ACTIVE.');
    console.log('  ✅ Partial filter:', JSON.stringify(concurrencyIndex.partialFilterExpression));
    console.log('  Double-booking prevention is enforced by MongoDB at the database layer.');
  } else {
    console.log('  ❌ Concurrency unique index missing!');
  }

  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

verify().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
