import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.cron("Patient Reminders", "0 6,14 * * *", async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart = new Date(tomorrow);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(tomorrow);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, doctor_id, start_time, patient:patients(first_name, last_name)")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString())
    .neq("status", "Cancelled");

  if (error) {
    console.error("Failed to fetch appointments:", error);
    return;
  }

  if (!appointments || appointments.length === 0) {
    console.log("No upcoming appointments tomorrow");
    return;
  }

  let inserted = 0;

  for (const apt of appointments) {
    const patientName = apt.patient
      ? `${apt.patient.first_name} ${apt.patient.last_name}`
      : "A patient";

    const time = new Date(apt.start_time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: apt.doctor_id,
          title: "Upcoming Appointment Tomorrow",
          message: `${patientName} at ${time}`,
          type: "Info",
          link: "/appointments",
        });

    if (insertError) {
      console.error(`Failed to insert notification for appointment ${apt.id}:`, insertError);
    } else {
      inserted++;
    }
  }

  console.log(`Inserted ${inserted} appointment reminder notifications`);
});
