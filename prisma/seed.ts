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
    // Individual (2)
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
      allergies: "Penicillin",
      nextOfKinName: "Jane Doe",
      nextOfKinPhone: "1234567891",
      nextOfKinRelation: "Spouse",
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
      category: "Individual",
      status: "active",
      bloodGroup: "A-",
      emergencyContact: "Kyle Reese",
      registrationDate: new Date(),
    },
    // Family — Adebayo group (2 members)
    {
      patientId: "ADEBAYO-001",
      firstName: "Tunde",
      lastName: "Adebayo",
      gender: "Male",
      dateOfBirth: new Date("1980-03-10"),
      phone: "+2348043333333",
      email: "tunde.adebayo@email.com",
      address: "7 Peace Close, Ibadan",
      category: "Family",
      status: "active",
      bloodGroup: "O-",
      nextOfKinName: "Funke Adebayo",
      nextOfKinPhone: "+2348054444444",
      nextOfKinRelation: "Spouse",
      registrationDate: new Date(),
    },
    {
      patientId: "ADEBAYO-002",
      firstName: "Funke",
      lastName: "Adebayo",
      gender: "Female",
      dateOfBirth: new Date("1985-08-17"),
      phone: "+2348054444444",
      email: "funke.adebayo@email.com",
      address: "7 Peace Close, Ibadan",
      category: "Family",
      status: "active",
      bloodGroup: "B+",
      nextOfKinName: "Tunde Adebayo",
      nextOfKinPhone: "+2348043333333",
      nextOfKinRelation: "Spouse",
      registrationDate: new Date(),
    },
    // Family — Okafor group (2 members)
    {
      patientId: "OKAFOR-001",
      firstName: "Chuka",
      lastName: "Okafor",
      gender: "Male",
      dateOfBirth: new Date("1978-01-05"),
      phone: "+2348101111111",
      email: "chuka.okafor@email.com",
      address: "23 Unity Rd, Enugu",
      category: "Family",
      status: "active",
      bloodGroup: "AB+",
      nextOfKinName: "Ngozi Okafor",
      nextOfKinPhone: "+2348112222222",
      nextOfKinRelation: "Spouse",
      registrationDate: new Date(),
    },
    {
      patientId: "OKAFOR-002",
      firstName: "Ngozi",
      lastName: "Okafor",
      gender: "Female",
      dateOfBirth: new Date("1982-06-30"),
      phone: "+2348112222222",
      email: "ngozi.okafor@email.com",
      address: "23 Unity Rd, Enugu",
      category: "Family",
      status: "active",
      bloodGroup: "A-",
      nextOfKinName: "Chuka Okafor",
      nextOfKinPhone: "+2348101111111",
      nextOfKinRelation: "Spouse",
      registrationDate: new Date(),
    },
    // Corporate (2)
    {
      patientId: "PAT004",
      firstName: "Emeka",
      lastName: "Nwosu",
      gender: "Male",
      dateOfBirth: new Date("1992-01-30"),
      phone: "+2348065555555",
      email: "emeka.nwosu@email.com",
      address: "10 Marina, Lagos",
      category: "Corporate",
      status: "active",
      bloodGroup: "B-",
      companyName: "ZenithCare Ltd",
      companyPhone: "+2348120000001",
      companyAddress: "Zenith Heights, Victoria Island, Lagos",
      registrationDate: new Date(),
    },
    {
      patientId: "PAT005",
      firstName: "Amara",
      lastName: "Okafor",
      gender: "Female",
      dateOfBirth: new Date("1990-07-14"),
      phone: "+2348076666666",
      email: "amara.okafor@email.com",
      address: "22 Broad St, Lagos",
      category: "Corporate",
      status: "active",
      bloodGroup: "AB-",
      companyName: "FirstBank Plc",
      companyPhone: "+2348120000002",
      companyAddress: "Samuel Asabia House, Marina, Lagos",
      registrationDate: new Date(),
    },
    // HMO (2)
    {
      patientId: "PAT006",
      firstName: "Ibrahim",
      lastName: "Musa",
      gender: "Male",
      dateOfBirth: new Date("1975-12-05"),
      phone: "+2348087777777",
      email: "ibrahim.musa@email.com",
      address: "5 Kano Rd, Kaduna",
      category: "HMO",
      status: "active",
      bloodGroup: "O+",
      insuranceProvider: "Hygeia HMO",
      insuranceId: "HGY-2024-001",
      registrationDate: new Date(),
    },
    {
      patientId: "PAT007",
      firstName: "Ngozi",
      lastName: "Eze",
      gender: "Female",
      dateOfBirth: new Date("1988-04-20"),
      phone: "+2348098888888",
      email: "ngozi.eze@email.com",
      address: "12 Enugu Rd, Port Harcourt",
      category: "HMO",
      status: "active",
      bloodGroup: "A-",
      insuranceProvider: "Reliance HMO",
      insuranceId: "RLN-2024-002",
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
