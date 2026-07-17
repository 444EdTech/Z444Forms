import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Clock, 
  Link as LinkIcon, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ExternalLink,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MockInterview {
  meetLink?: string;
  startTime?: string;
  endTime?: string;
}

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  yearOfStudy: string;
  branch: string;
  collegeName: string;
  createdAt: string;
  mockInterview?: MockInterview;
}

export default function MockInterviewAdmin() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/home-submissions");
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleUpdate = async (id: string, details: MockInterview) => {
    setUpdatingId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/update-mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...details })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Interview details saved successfully!" });
        // Update local state
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, mockInterview: details } : s));
      } else {
        setMessage({ type: "error", text: data.message || "Failed to save details." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Mock Interview Manager
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign Google Meet links and time slots to candidates
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full md:w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 border ${
              message.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Syncing profile registrations...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No registrations found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredSubmissions.map((item) => (
            <InterviewRow 
              key={item.id} 
              item={item} 
              onSave={(details) => handleUpdate(item.id, details)}
              isUpdating={updatingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InterviewRow({ item, onSave, isUpdating }: { item: Submission, onSave: (details: MockInterview) => void, isUpdating: boolean }) {
  const [meetLink, setMeetLink] = useState(item.mockInterview?.meetLink || "");
  const [startTime, setStartTime] = useState(item.mockInterview?.startTime || "");
  const [endTime, setEndTime] = useState(item.mockInterview?.endTime || "");

  const hasChanges = meetLink !== (item.mockInterview?.meetLink || "") ||
                     startTime !== (item.mockInterview?.startTime || "") ||
                     endTime !== (item.mockInterview?.endTime || "");

  return (
    <motion.div 
      layout
      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-800/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white leading-none">{item.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                {item.email}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
              {item.branch} • {item.yearOfStudy}Y
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              Google Meet Link
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="10:30 AM"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {item.mockInterview?.meetLink && (
              <a 
                href={item.mockInterview.meetLink} 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Test Link <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          
          <button
            disabled={!hasChanges || isUpdating}
            onClick={() => onSave({ meetLink, startTime, endTime })}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              hasChanges 
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/15" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isUpdating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Assignment
          </button>
        </div>
      </div>
    </motion.div>
  );
}
