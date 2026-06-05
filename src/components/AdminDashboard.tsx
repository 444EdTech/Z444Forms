/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { StudentRegistration } from "../types";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Filter, 
  GraduationCap, 
  TrendingUp, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Clock, 
  Building2,
  Lock,
  Eye,
  CheckCircle,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  
  // Analytics
  const [stats, setStats] = useState({
    total: 0,
    y1: 0,
    y2: 0,
    y3: 0,
    y4: 0,
    completed: 0,
  });

  const [departments, setDepartments] = useState<Record<string, number>>({});

  const fetchRegistrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/local-registrations");
      const json = await res.json();
      if (res.ok && json.success) {
        const sorted = (json.registrations || []).sort(
          (a: StudentRegistration, b: StudentRegistration) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRegistrations(sorted);
        calculateStats(sorted);
      } else {
        setError(json.error || "Failed to fetch student entries.");
      }
    } catch (err) {
      console.error("Local fetch err:", err);
      setError("Failed to communicate with masterclass backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: StudentRegistration[]) => {
    const counts = {
      total: data.length,
      y1: 0,
      y2: 0,
      y3: 0,
      y4: 0,
      completed: 0,
    };

    const depCounts: Record<string, number> = {};

    data.forEach(item => {
      // Study Year counters
      if (item.btechYear === "1") counts.y1++;
      else if (item.btechYear === "2") counts.y2++;
      else if (item.btechYear === "3") counts.y3++;
      else if (item.btechYear === "4") counts.y4++;
      else if (item.btechYear === "Completed") counts.completed++;

      // Department counters
      const d = item.department.trim().toUpperCase();
      depCounts[d] = (depCounts[d] || 0) + 1;
    });

    setStats(counts);
    setDepartments(depCounts);
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const filteredRegistrations = registrations.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesYear = selectedYear === "All" || item.btechYear === selectedYear;

    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-slate-900 border border-slate-850 text-white rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            Authorized Panel
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Z444 Masterclass Workspace</h2>
          <p className="text-slate-400 text-xs mt-0.5">Dual-synchronized registers for June 7th 10:00 AM session</p>
        </div>

        <button
          onClick={fetchRegistrations}
          disabled={isLoading}
          className="relative z-10 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-xs font-semibold rounded-lg flex items-center gap-2 border border-slate-700/60 cursor-pointer active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Reload Database
        </button>
      </div>

      {/* Analytics Bento block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xl shadow-slate-100/30 dark:shadow-none flex items-center justify-between transition-colors duration-300">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Entries</span>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">{stats.total}</h3>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              Realtime synced
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center transition-colors">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Btech distribution stats mini bar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xl shadow-slate-100/30 dark:shadow-none md:col-span-3 transition-colors duration-300">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-4">Registration Distribution by B.Tech Year</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            
            {[
              { label: "1st Year", count: stats.y1, color: "bg-blue-500" },
              { label: "2nd Year", count: stats.y2, color: "bg-emerald-500" },
              { label: "3rd Year", count: stats.y3, color: "bg-indigo-500" },
              { label: "4th Year", count: stats.y4, color: "bg-violet-500" },
              { label: "Graduated", count: stats.completed, color: "bg-amber-500" },
            ].map((y, idx) => {
              const pct = stats.total > 0 ? (y.count / stats.total) * 100 : 0;
              return (
                <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between transition-colors duration-300">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none">{y.label}</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{y.count}</p>
                  </div>
                  <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div className={`h-full ${y.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* Main Table area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-xl shadow-slate-100/30 dark:shadow-none overflow-hidden transition-colors duration-300">
        
        {/* Search and Filters panel */}
        <div className="p-6 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300">
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students by name, email, department or phone..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-100/30 rounded-lg text-xs font-semibold focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Filter Year:
            </span>
            <div className="flex bg-slate-200/40 dark:bg-slate-800 p-1 rounded-lg transition-colors">
              {["All", "1", "2", "3", "4", "Completed"].map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-all ${selectedYear === year ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  {year === "All" ? "All" : year === "Completed" ? "Grad" : `${year} Yr`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-6 text-center text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-950 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* List of registrations */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Loading Student Register...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-bold text-slate-500 mt-2">No student registration matches the filter</p>
            <p className="text-[11px] text-slate-400">Awaiting your first student entry</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-850">
                  <th className="p-4 pl-6">Student Info</th>
                  <th className="p-4">Contact Detail</th>
                  <th className="p-4">B.Tech Year</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 pr-6">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs font-medium">
                {filteredRegistrations.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/30 transition-all duration-150">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{item.id}</div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{item.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                        item.btechYear === "1" ? "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40" :
                        item.btechYear === "2" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40" :
                        item.btechYear === "3" ? "bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40" :
                        item.btechYear === "4" ? "bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40" :
                        "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40"
                      }`}>
                        <GraduationCap className="w-3.5 h-3.5" />
                        {item.btechYear === "Completed" ? "Graduate" : `${item.btechYear} Year`}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{item.department}</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{new Date(item.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Database state indicators */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850 flex flex-wrap justify-between items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider transition-colors duration-300">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Local Database File: active ({registrations.length} Backups)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Cloud Sync: Active rules (444edtech only)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
