import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Departments
  const departments = [
    { name: "General Medicine", description: "OPD and General ward" },
    { name: "Radiology", description: "X-ray, MRI, CT scans" },
    { name: "Laboratory", description: "Pathology and Blood tests" },
    { name: "Pharmacy", description: "Main hospital pharmacy" },
    { name: "Emergency", description: "24/7 ER services" },
    { name: "Pediatrics", description: "Children ward" },
  ];

  for (const dep of departments) {
    await prisma.department.upsert({
      where: { name: dep.name },
      update: {},
      create: dep,
    });
  }

  const allDeps = await prisma.department.findMany();
  const genMed = allDeps.find((d) => d.name === "General Medicine")!;
  const labDep = allDeps.find((d) => d.name === "Laboratory")!;
  const pharmDep = allDeps.find((d) => d.name === "Pharmacy")!;

  // 2. Users (Staff)
  const hashedPassword = await bcrypt.hash("password123", 10);

  const staffData = [
    {
      fullName: "Super Admin",
      email: "admin@icare.com",
      password: hashedPassword,
      role: "SuperAdmin",
      departmentId: genMed.id,
      staffProfile: {
        create: {
          staffId: "STF001",
          departmentId: genMed.id,
          employmentType: "Full-time",
          dateJoined: new Date(),
          permissions: "all",
        },
      },
    },
    {
      fullName: "Dr. Alice Smith",
      email: "alice@icare.com",
      password: hashedPassword,
      role: "Doctor",
      departmentId: genMed.id,
      staffProfile: {
        create: {
          staffId: "STF002",
          departmentId: genMed.id,
          employmentType: "Full-time",
          dateJoined: new Date(),
          permissions: "doc",
        },
      },
    },
    {
      fullName: "Dr. Bob Wilson",
      email: "bob@icare.com",
      password: hashedPassword,
      role: "Doctor",
      departmentId: genMed.id,
      staffProfile: {
        create: {
          staffId: "STF003",
          departmentId: genMed.id,
          employmentType: "Full-time",
          dateJoined: new Date(),
          permissions: "doc",
        },
      },
    },
    {
      fullName: "Nurse Jane",
      email: "jane@icare.com",
      password: hashedPassword,
      role: "Nurse",
      departmentId: genMed.id,
      staffProfile: {
        create: {
          staffId: "STF004",
          departmentId: genMed.id,
          employmentType: "Full-time",
          dateJoined: new Date(),
          permissions: "nurse",
        },
      },
    },
    {
      fullName: "Sam Lab",
      email: "sam@icare.com",
      password: hashedPassword,
      role: "LabTechnician",
      departmentId: labDep.id,
      staffProfile: {
        create: {
          staffId: "STF005",
          departmentId: labDep.id,
          employmentType: "Full-time",
          dateJoined: new Date(),
          permissions: "lab",
        },
      },
    },
    {
      fullName: "Phil Pharmacist",
      email: "phil@icare.com",
      password: hashedPassword,
      role: "Pharmacist",
      departmentId: pharmDep.id,
      staffProfile: {
        create: {
          staffId: "STF006",
          departmentId: pharmDep.id,
          employmentType: "Full-time",
          dateJoined: new Date(),
          permissions: "pharm",
        },
      },
    },
  ];

  for (const staff of staffData) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: staff,
    });
  }

  // 3. Patients
  const patients = [
    {
      patientId: "PAT001",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      dateOfBirth: new Date("1990-01-01"),
      phone: "1234567890",
      email: "john@example.com",
      address: "123 Main St",
      category: "Individual",
      status: "active",
      bloodGroup: "O+",
      registrationDate: new Date(),
    },
    {
      patientId: "PAT002",
      firstName: "Sarah",
      lastName: "Connor",
      gender: "Female",
      dateOfBirth: new Date("1985-05-15"),
      phone: "0987654321",
      email: "sarah@example.com",
      address: "456 Oak Rd",
      category: "Family",
      status: "active",
      bloodGroup: "A-",
      registrationDate: new Date(),
    },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { patientId: p.patientId },
      update: {},
      create: p,
    });
  }

  // 4. Medications
  const meds = [
    { name: "Paracetamol", dosageForm: "Tablet", strength: "500mg", unitPrice: 0.5, quantityInStock: 1000 },
    { name: "Amoxicillin", dosageForm: "Capsule", strength: "250mg", unitPrice: 1.2, quantityInStock: 500 },
    { name: "Ibuprofen", dosageForm: "Tablet", strength: "400mg", unitPrice: 0.8, quantityInStock: 800 },
    { name: "Insulin", dosageForm: "Injection", strength: "100IU/ml", unitPrice: 45.0, quantityInStock: 50 },
  ];

  for (const m of meds) {
    await prisma.medication.create({ data: m });
  }

  // 5. Lab Tests
  const tests = [
    { name: "Complete Blood Count", category: "Hematology", price: 25.0, sampleType: "Blood" },
    { name: "Lipid Profile", category: "Biochemistry", price: 40.0, sampleType: "Blood" },
    { name: "Urinalysis", category: "Urology", price: 15.0, sampleType: "Urine" },
    { name: "Chest X-Ray", category: "Radiology", price: 60.0, sampleType: "Imaging" },
  ];

  for (const t of tests) {
    await prisma.labTest.create({ data: t });
  }

  // 6. Wards and Beds
  const ward = await prisma.ward.create({
    data: {
      name: "Male Medical Ward",
      type: "General",
      bedsCount: 10,
      departmentId: genMed.id,
      beds: {
        create: Array.from({ length: 5 }, (_, i) => ({
          bedNumber: `M-BED-${i + 1}`,
          status: "Available",
        })),
      },
    },
  });

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
