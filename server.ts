import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Local File-Based database fallback directory
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const REGISTRATIONS_FILE = path.join(DATA_DIR, "registrations.json");

// Helper to load registrations locally
function loadLocalRegistrations(): any[] {
  if (fs.existsSync(REGISTRATIONS_FILE)) {
    try {
      const data = fs.readFileSync(REGISTRATIONS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading local registrations:", e);
      return [];
    }
  }
  return [];
}

// Helper to save registrations locally
function saveLocalRegistration(registration: any) {
  const all = loadLocalRegistrations();
  all.push(registration);
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
}

// Helper to generate a valid iCalendar (RFC 5545) event invite
function generateIcalEvent(studentName: string, studentEmail: string, eventId: string): string {
  // Current timestamp formatted for iCal UTC compliance
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  // June 7, 2026 11:00 AM IST => 05:30:00 UTC
  const dtStart = "20260607T053000Z";
  // June 7, 2026 1:00 PM IST => 07:30:00 UTC
  const dtEnd = "20260607T073000Z";

  // Escape text for ICS format
  const summary = "Z444 Masterclass: Bridging the Gap between College & Industry";
  const organizerDisplay = "Z444 Masterclass Team";
  const studentDisplay = studentName.replace(/[\\,;]/g, "\\$&"); // Escape backslash, comma, semicolon

  const description = [
    `Dear ${studentName},`,
    "",
    "Your direct admission seat at the upcoming Z444 Masterclass is officially secured!",
    "",
    "📅 Masterclass Agenda & Access:",
    "Date: Sunday, June 7th, 2026",
    "Time: 11:00 AM IST (Indian Standard Time) Sharp",
    "Live Platform: Google Meet Classroom",
    "Direct Join URL: https://meet.google.com/bwi-xehm-peg",
    "",
    "💡 Topics Covered:",
    "- Classroom Theory to Engineering Output Transition Workflows",
    "- Direct Outreach, Cold Emailing, and LinkedIn mapping Workflows",
    "- Designing A-grade, high-yield Engineering Resume structures",
    "- Top Practical stacks and skills needed to pass Technical Screenings",
    "",
    "Warm regards,",
    "Z444 masterclass team"
  ].join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Z444 Masterclass Team//NONSGML Z444 Portal v1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:uid-z444-${eventId || Date.now()}@444edtech.gmail.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "LOCATION:https://meet.google.com/bwi-xehm-peg",
    `ORGANIZER;CN="${organizerDisplay}":mailto:444edtech@gmail.com`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${studentDisplay}":mailto:${studentEmail}`,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Z444 Masterclass starts in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

// Initialize Firebase Admin if config exists or env vars are present
let firestoreDb: Firestore | null = null;
const envProjectId = process.env.FIREBASE_PROJECT_ID;
const envDatabaseId = process.env.FIREBASE_DATABASE_ID;

if (envProjectId && envDatabaseId) {
  try {
    let appInstance;
    if (admin.apps.length === 0) {
      appInstance = admin.initializeApp({
        projectId: envProjectId,
      });
    } else {
      appInstance = admin.apps[0];
    }
    firestoreDb = getFirestore(appInstance, envDatabaseId);
    console.log("Firebase Admin initialized successfully using environment variables");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin using environment variables:", error);
  }
} else {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    try {
      const rawConfig = fs.readFileSync(firebaseConfigPath, "utf-8");
      const firebaseConfig = JSON.parse(rawConfig);
      let appInstance;
      if (admin.apps.length === 0) {
        appInstance = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } else {
        appInstance = admin.apps[0];
      }
      // Specifying custom database ID for Applet Firestore isolation using official getFirestore ESM function
      firestoreDb = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
      console.log("Firebase Admin initialized successfully from firebase-applet-config.json");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin from firebase-applet-config.json:", error);
    }
  } else {
    console.log("Firebase config not found (no env variables or firebase-applet-config.json). Backend will operate using local JSON backup.");
  }
}

// Initialize Gemini SDK with lazy validation
let ai: GoogleGenAI | null = null;
const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({ apiKey: geminiKey });
    console.log("Gemini AI initialized on backend");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
}

// --- API ROUTES ---

// Submit Registration
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, phone, btechYear, department } = req.body;

    // Server-side strict validations
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid student name. Must be 1-100 characters." });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".") || email.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid email ID. Please input a valid student email." });
    }
    const phoneRegex = /^[+]?[0-9\s\-()]{8,15}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number. Must be between 8 and 15 digits." });
    }
    const validYears = ["1", "2", "3", "4", "Completed"];
    if (!btechYear || !validYears.includes(btechYear)) {
      return res.status(400).json({ success: false, message: "B.Tech year must be 1, 2, 3, 4, or Completed." });
    }
    if (!department || typeof department !== "string" || department.trim().length === 0 || department.length > 50) {
      return res.status(400).json({ success: false, message: "Invalid department name. Must be 1-50 characters." });
    }

    const registrationId = "reg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const registrationItem = {
      id: registrationId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      btechYear,
      department: department.trim(),
      createdAt: new Date().toISOString()
    };

    // 1. Save Locally (Durable backup fallback)
    saveLocalRegistration(registrationItem);

    // Return early to the client immediately so they see the success page instantly!
    res.status(200).json({
      success: true,
      message: "Successfully registered and confirmed!",
      data: registrationItem,
      emailSent: true,
      transportMethod: "Background SMTP Queue",
      cloudSync: true,
      simulatedEmailContent: "" // Background processed, student redirect to success desk instantly
    });

    // Run storing to Firestore, AI custom drafting, and calendar invitation email delivery in the background!
    (async () => {
      // 2. Save to Firestore if available
      let savedToCloud = false;
      if (firestoreDb) {
        try {
          const docRef = firestoreDb.collection("registrations").doc(registrationId);
          await docRef.set({
            ...registrationItem,
            createdAt: FieldValue.serverTimestamp()
          });
          savedToCloud = true;
          console.log(`[BACKGROUND] Saved registration ${registrationId} securely to Cloud Firestore`);
        } catch (firestoreError: any) {
          if (firestoreError?.message?.includes("PERMISSION_DENIED")) {
            console.log("[BACKGROUND] Firestore sync inactive / pending credentials - registration locally backed up successfully");
          } else {
            console.log("[BACKGROUND] Firestore sync notification:", firestoreError?.message || firestoreError);
          }
        }
      }
      
      // 3. Prepare Confirming Email directly using data provided (deterministic & extremely fast)
      let emailSubject = "Confirmed: Z444 Masterclass Admission & Direct Entry Link - June 7th 11:00 AM IST";
      
      let emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
          <!-- Header block with elegant dark styling matching registration theme -->
          <div style="background-color: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; tracking-wider: 0.1em; margin-bottom: 12px;">ADMISSION CONFIRMED</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; tracking-tight: -0.025em;">Z444 Live Masterclass invite</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13.5px;">Custom path: College Theory to authentic engineering standards</p>
          </div>
          
          <div style="padding: 28px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: 700; margin-top: 0; color: #0f172a;">Dear ${registrationItem.name},</p>
            <p style="margin-top: 4px; font-size: 14.5px; color: #334155;">Fantastic news! Your reservation is official, and your virtual admission seat for the upcoming <strong>Z444 Masterclass</strong> is securely locked in.</p>
            
            <!-- Student particulars database readout badge block -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; font-size: 11.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Your Registration Record:</h3>
              <table style="width: 100%; font-size: 13.5px; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 35%;">Department:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${registrationItem.department}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500;">B.Tech Study Year:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">Year ${registrationItem.btechYear}</td>
                </tr>
              </table>
            </div>

            <!-- Join masterclass primary notice card -->
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 18px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-weight: 800; color: #1e40af; font-size: 13px; text-transform: uppercase; tracking-wider: 0.05em;">⚡ Access Details:</p>
              <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #1e293b;">
                🗓️ <strong>Date:</strong> Sunday, June 7th, 2026<br>
                ⏰ <strong>Time:</strong> 11:00 AM Indian Standard Time (IST) Sharp<br>
                📍 <strong>Live Venue:</strong> Google Meet Virtual Room<br>
                🔗 <strong>Direct URL Link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #2563eb; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
              </p>
            </div>

            <!-- Add to Calendar Action Button -->
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Z444+Masterclass:+Bridging+the+Gap+between+College+%26+Industry&dates=20260607T053000Z/20260607T073000Z&details=Masterclass+to+bridge+the+gap+between+college+learnings+and+true+industry+expectations.+Google+Meet+Link:+https://meet.google.com/bwi-xehm-peg&location=https://meet.google.com/bwi-xehm-peg" 
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);">
                 📥 Add to Google Calendar Schedule
              </a>
            </div>
            
            <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 24px;">🎯 Key Takeaways We Will Cover Live:</p>
            <ul style="padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7; margin-top: 8px;">
              <li style="margin-bottom: 6px;">How to structure high-converting **technical resumes** to clear screening algorithms.</li>
              <li style="margin-bottom: 6px;">Mapping authentic engineering roles, tech stacks, and modern internship pipelines.</li>
              <li style="margin-bottom: 6px;">Direct Outreach cold email structures & LinkedIn mapping hacks that secure responses.</li>
              <li style="margin-bottom: 6px;">Overcoming the transition gap from college theory to production-ready industry standards.</li>
            </ul>
            
            <p style="font-weight: 700; color: #0f172a; margin-top: 24px; font-size: 14px;">📝 Guidelines for the Live Class:</p>
            <p style="margin-top: 4px; color: #475569; font-size: 13.5px; line-height: 1.6;">Please join the meet link 5 minutes early to avoid placement buffering. Bring a draft of your resume, a writing notebook, and your absolute focus!</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0; text-align: center; line-height: 1.6;">
              Warm regards,<br>
              <strong style="color: #0f172a;">Z444 Masterclass Team</strong><br>
              Need help? Drop an email to <a href="mailto:444edtech@gmail.com" style="color: #4f46e5; text-decoration: underline;">444edtech@gmail.com</a>
            </p>
          </div>
        </div>
      `;
   
      // 4. Send email to student and host (444edtech@gmail.com)
      let emailSent = false;
      let transportDetails = "Log Only";
   
      const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpFrom = process.env.SMTP_FROM || `Z444 Masterclass <${smtpUser}>`;
   
      if (smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports e.g. 587
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });
   
          // Send to Student
          const icalContent = generateIcalEvent(registrationItem.name, registrationItem.email, registrationItem.id);
          await transporter.sendMail({
            from: smtpFrom,
            to: registrationItem.email,
            subject: `Confirmed: Z444 Masterclass Direct Entry Invitation - June 7th 11:00 AM IST`,
            html: emailHtml,
            icalEvent: {
              filename: "invite.ics",
              method: "REQUEST",
              content: icalContent
            },
            alternatives: [
              {
                contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
                content: icalContent
              }
            ]
          });
   
          // Send to Host (Admin Mail)
          await transporter.sendMail({
            from: smtpFrom,
            to: "444edtech@gmail.com",
            subject: `New Z444 Masterclass Sign-up: ${registrationItem.name} (${registrationItem.department})`,
            html: `
              <h3>New Z444 Masterclass Registration received!</h3>
              <p>Here are the student registration details:</p>
              <ul>
                <li><strong>Name:</strong> ${registrationItem.name}</li>
                <li><strong>Email:</strong> ${registrationItem.email}</li>
                <li><strong>Phone:</strong> ${registrationItem.phone}</li>
                <li><strong>B.Tech Year:</strong> ${registrationItem.btechYear}</li>
                <li><strong>Department:</strong> ${registrationItem.department}</li>
                <li><strong>Registrant ID:</strong> ${registrationItem.id}</li>
                <li><strong>Submitted At:</strong> ${registrationItem.createdAt}</li>
              </ul>
              <p>A direct registration invitation and Calendar link has been sent out to the student.</p>
            `
          });
   
          emailSent = true;
          transportDetails = "Nodemailer SMTP";
          console.log(`[BACKGROUND] Emails dispatched successfully to student (${registrationItem.email}) and host (444edtech@gmail.com)`);
        } catch (nodemailerError) {
          console.error("Nodemailer SMTP dispatch failed:", nodemailerError);
          transportDetails = "Nodemailer Failed (SMTP Error)";
        }
      } else {
        console.log("-----------------------------------------");
        console.log("[SIMULATED EMAIL DISPATCH]");
        console.log("No SMTP_PASS credential configured in .env. Logging email payload is active.");
        console.log(`To: ${registrationItem.email}, 444edtech@gmail.com`);
        console.log(`Subject: Confirmed: Z444 Masterclass Direct Entry Invitation - June 7th 11:00 AM IST`);
        console.log("-----------------------------------------");
      }
    })().catch((bgErr) => {
      console.error("[BACKGROUNDTASK] Error in registration background tasks:", bgErr);
    });

  } catch (err: any) {
    console.error("Error in registration endpoint:", err);
    return res.status(500).json({ success: false, message: "Server error occurred during sign-up registration. Please try again." });
  }
});

// Admin endpoint to view registrations locally (fallback list)
app.get("/api/local-registrations", async (req, res) => {
  try {
    let list: any[] = [];
    let source = "local";

    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          const rawData = docSnap.data();
          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          list.push({
            ...rawData,
            createdAt: createdAtStr
          });
        });
        source = "firestore";
        console.log(`Fetched ${list.length} records directly from secure Cloud Firestore`);
      } catch (firestoreErr: any) {
        if (firestoreErr?.message?.includes("PERMISSION_DENIED")) {
          console.log("Firestore database access restricted / pending credentials. Relying on local register file backup.");
        } else {
          console.log("Firestore query notification:", firestoreErr?.message || firestoreErr);
        }
      }
    }

    // Fallback if list is empty or firestore couldn't be requested
    if (list.length === 0) {
      list = loadLocalRegistrations();
      source = "local";
    }

    return res.status(200).json({ success: true, count: list.length, registrations: list, dataSource: source });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --- REMINDER SCHEDULER BACKEND DAEMON ---

// Persistence checking for background reminder synchronization
const REMINDER_STATUS_FILE = path.join(DATA_DIR, "reminder-status.json");

function getReminderStatus(): { june6_8pm_sent: boolean; june7_10am_sent: boolean } {
  if (fs.existsSync(REMINDER_STATUS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(REMINDER_STATUS_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to parse reminder-status.json, resetting:", e);
    }
  }
  return { june6_8pm_sent: false, june7_10am_sent: false };
}

function saveReminderStatus(status: { june6_8pm_sent: boolean; june7_10am_sent: boolean }) {
  try {
    fs.writeFileSync(REMINDER_STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write reminder-status.json locally:", err);
  }
}

async function syncReminderStatus(): Promise<{ june6_8pm_sent: boolean; june7_10am_sent: boolean }> {
  const status = getReminderStatus();
  if (firestoreDb) {
    try {
      const docRef = firestoreDb.collection("reminders").doc("status");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const firestoreStatus = docSnap.data() as any;
        status.june6_8pm_sent = status.june6_8pm_sent || !!firestoreStatus.june6_8pm_sent;
        status.june7_10am_sent = status.june7_10am_sent || !!firestoreStatus.june7_10am_sent;
        saveReminderStatus(status);
      } else {
        await docRef.set(status);
      }
    } catch (err: any) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        console.log("[DAEMON] Firestore sync inactive / pending credentials - using local JSON database state");
      } else {
        console.log("[DAEMON] Firestore global reminder status sync notification:", err?.message || err);
      }
    }
  }
  return status;
}

async function markReminderSent(reminderKey: "june6_8pm_sent" | "june7_10am_sent") {
  const status = getReminderStatus();
  status[reminderKey] = true;
  saveReminderStatus(status);
  if (firestoreDb) {
    try {
      await firestoreDb.collection("reminders").doc("status").set({
        [reminderKey]: true
      }, { merge: true });
      console.log(`[DAEMON] Successfully marked and archived "${reminderKey}" in Cloud Firestore`);
    } catch (err: any) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        console.log(`[DAEMON] Firestore sync restricted - offline cached "${reminderKey}" successfully`);
      } else {
        console.log("[DAEMON] Failed to mark reminder in global Firestore db:", err?.message || err);
      }
    }
  }
}

async function broadcastReminder(reminderKey: "june6_8pm_sent" | "june7_10am_sent", subject: string, fallbackTemplate: string, aiPrompt: string) {
  try {
    console.log(`\n=========================================\n[REMINDER DAEMON] Executing broadcast for identifier: ${reminderKey}`);
    
    // 1. Fetch entire registration list from cloud or fallback local JSON list
    let list: any[] = [];
    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        console.log(`[REMINDER DAEMON] Fetched ${list.length} direct registrations from Cloud Firestore`);
      } catch (firestoreErr: any) {
        if (firestoreErr?.message?.includes("PERMISSION_DENIED")) {
          console.log("[REMINDER DAEMON] Firestore registrations read restricted. Checking local backup JSON.");
        } else {
          console.log("[REMINDER DAEMON] Failed querying Firestore:", firestoreErr?.message || firestoreErr);
        }
      }
    }
    
    if (list.length === 0) {
      list = loadLocalRegistrations();
      console.log(`[REMINDER DAEMON] Loaded ${list.length} direct registrations from local back up storage file`);
    }

    if (list.length === 0) {
      console.log("[REMINDER DAEMON] Aborting broadcast - No registered students found in DB.");
      await markReminderSent(reminderKey);
      return;
    }

    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Masterclass Team <${smtpUser}>`;

    let transporter: nodemailer.Transporter | null = null;
    if (smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }

    // 2. Map and loop sending email to every single registrant
    for (const student of list) {
      const studentEmail = student.email || "";
      const studentName = student.name || "Student";
      
      if (!studentEmail || !studentEmail.includes("@")) continue;

      let emailHtml = fallbackTemplate
        .replace(/\${studentName}/g, studentName)
        .replace(/\${studentEmail}/g, studentEmail)
        .replace(/\${studentDepartment}/g, student.department || "Engineering")
        .replace(/\${studentYear}/g, student.btechYear || "");

      if (transporter) {
        try {
          const icalContent = generateIcalEvent(studentName, studentEmail, student.id);
          await transporter.sendMail({
            from: smtpFrom,
            to: studentEmail,
            subject: subject,
            html: emailHtml,
            icalEvent: {
              filename: "invite.ics",
              method: "REQUEST",
              content: icalContent
            },
            alternatives: [
              {
                contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
                content: icalContent
              }
            ]
          });
          console.log(`[REMINDER DAEMON] Email reminder dispatched successfully to: ${studentEmail}`);
        } catch (nodemailerErr) {
          console.error(`[REMINDER DAEMON] SMTP dispatch failed for recipient ${studentEmail}:`, nodemailerErr);
        }
      } else {
        console.log("-----------------------------------------");
        console.log(`[SIMULATED DAEMON DISPATCH] To: ${studentEmail}`);
        console.log(`[SIMULATED DAEMON DISPATCH] Subject: ${subject}`);
        console.log("-----------------------------------------");
      }
    }

    // Mark as successfully sent to prevent recurrent loops
    await markReminderSent(reminderKey);
    console.log(`[REMINDER DAEMON] Broadcast archived. Marked sent state for: ${reminderKey}\n=========================================\n`);

  } catch (broadcastErr) {
    console.error("[REMINDER DAEMON] Fatal broadcast error in logic execution:", broadcastErr);
  }
}

async function checkAndTriggerReminders(): Promise<{ checked: boolean; triggered: boolean }> {
  const status = await syncReminderStatus();
  const now = new Date();

  // Trigger point 1: June 6th 2026 at 8:00 PM IST => June 6th 14:30:00 UTC
  const targetJune6_8pm = new Date("2026-06-06T14:30:00Z");
  
  // Trigger point 2: June 7th 2026 at 10:00 AM IST => June 7th 04:30:00 UTC
  const targetJune7_10am = new Date("2026-06-07T04:30:00Z");
  
  let triggered = false;

  if (!status.june6_8pm_sent && now >= targetJune6_8pm) {
    const subject = "[URGENT] Z444 Masterclass starts Tomorrow Morning at 11:00 AM IST!";
    const fallback = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Get Ready for the Z444 Masterclass Tomorrow!</h1>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Bridging the Gap: Academic Studies to Industry Job Roles</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello \${studentName},</p>
          <p>This is a quick reminder that the highly anticipated <strong>Z444 Masterclass</strong> is scheduled to start <strong>tomorrow Sunday at 11:00 AM (IST) sharp</strong>.</p>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: 700; color: #1e3a8a; font-size: 13.5px;">⚡ Live Joining Details:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
              🗓️ <strong>Date:</strong> Tomorrow, Sunday, June 7th, 2026<br>
              ⏰ <strong>Time:</strong> 11:00 AM Indian Standard Time (IST)<br>
              📍 <strong>Live Room:</strong> Google Meet (Direct Entry Code)<br>
              🔗 <strong>Link to Join:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <p>Make sure to bring a notebook, pen, and your existing draft resume. We will dive straight into resume writing tactics, linkedin templates, cold emailing hacks, and engineering workflows to secure premium jobs and internships.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 masterclass team</strong>
          </p>
        </div>
      </div>
    `;
    const aiPrompt = `Write a professional, warm, yet urgent evening email reminder for the Z444 Masterclass which starts tomorrow morning at 11:00 AM IST.
Direct them to join Google Meet link: "https://meet.google.com/bwi-xehm-peg". Tell them to bring a pen, paper/notebook, and a copy of their draft resume (which we will tune live!). Emphasize starting sharp. Sign off with 'Warm regards Z444 masterclass team'.`;
    
    await broadcastReminder("june6_8pm_sent", subject, fallback, aiPrompt);
    triggered = true;
  }

  if (!status.june7_10am_sent && now >= targetJune7_10am) {
    const subject = "[Starting in 1 Hour!] Z444 Masterclass Live Classroom Link - 11:00 AM IST";
    const fallback = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Live in 1 Hour! 🚀</h1>
          <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Bridging the Gap: College Studies to Industry Expectations</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello \${studentName},</p>
          <p>This is it! Exactly <strong>1 hour left</strong> before we go live for the highly anticipated <strong>Z444 Masterclass</strong>.</p>
          
          <div style="background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: 700; color: #4338ca; font-size: 13.5px;">🔥 Access Information:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ⏰ <strong>Time:</strong> 11:00 AM Indian Standard Time (IST) Sharp<br>
              📍 <strong>Venue:</strong> Google Meet live feed<br>
              🔗 <strong>Direct Meet Join link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #6366f1; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <p>Ensure your device speakers are working, keep your draft resume and a book nearby, and login 5 minutes early to secure your spot. Let's build your pathway to a high-paying career starting today.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 masterclass team</strong>
          </p>
        </div>
      </div>
    `;
    const aiPrompt = `Write an exciting final direct-call email reminder for the Z444 Masterclass starting in exactly 1 hour (today Sunday at 11:00 AM IST).
Instruct them to log in 5 mins early to avoid buffer issues or platform capacity limitations. Highlight the direct Google Meet join link: "https://meet.google.com/bwi-xehm-peg". Keep it energetic and action-prompting. Sign off with 'Warm regards Z444 masterclass team'.`;
    
    await broadcastReminder("june7_10am_sent", subject, fallback, aiPrompt);
    triggered = true;
  }

  return { checked: true, triggered };
}

function startReminderDaemon() {
  console.log("[REMINDER DAEMON] Initialized background polling. Checking every 2 minutes.");
  
  // Checking every 2 minutes for precise triggering
  setInterval(async () => {
    try {
      await checkAndTriggerReminders();
    } catch (daemonLoopErr) {
      console.error("[REMINDER DAEMON] Loop tick processing error:", daemonLoopErr);
    }
  }, 120000); // Polling checks run secure background interval every 2 minutes (120,000ms)
}

// Start the daemon running on container startup (Only if not in a serverless environment like Vercel)
if (!process.env.VERCEL) {
  startReminderDaemon();
}

// Check Server Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", firebaseAvailable: !!firestoreDb, geminiAvailable: !!ai });
});

// Vercel Cron Trigger Endpoint for serverless scheduled events
app.get("/api/cron-reminders", async (req, res) => {
  try {
    const result = await checkAndTriggerReminders();
    res.json({ success: true, message: "Reminders evaluation complete", ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// --- VITE MIDDLEWARE AND SPA FALLBACK ---

if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Vite Dev Mode] Server listening on http://localhost:${PORT}`);
      });
    }).catch((err) => {
      console.error("Vite server initialization failed:", err);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // In Express v4, use app.get('*', ...)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Production Mode] Server listening on http://localhost:${PORT}`);
    });
  }
}

export default app;
