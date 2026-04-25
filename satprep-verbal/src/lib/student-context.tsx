"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Student = {
  id: string;
  name: string;
};

type StudentContextValue = {
  student: Student | null;
  clearStudent: () => void;
};

const StudentContext = createContext<StudentContextValue>({
  student: null,
  clearStudent: () => {},
});

export function useStudent() {
  return useContext(StudentContext);
}

const STORAGE_KEY = "satprep_student";

export function StudentProvider({ children }: { children: ReactNode }) {
  const [student, setStudentState] = useState<Student | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Form state
  const [nameInput, setNameInput] = useState("");
  const [idInput, setIdInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Student;
        if (parsed.id && parsed.name) {
          setStudentState(parsed);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function saveStudent(s: Student) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setStudentState(s);
  }

  function clearStudent() {
    localStorage.removeItem(STORAGE_KEY);
    setStudentState(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedId = idInput.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!trimmedId) {
      setError("Please enter your student ID.");
      return;
    }
    setError("");
    saveStudent({ id: trimmedId, name: trimmedName });
  }

  if (!hydrated) {
    return null;
  }

  if (!student) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900">Welcome to SAT Prep</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your details to get started.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="student-name" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="student-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="student-id" className="block text-sm font-medium text-slate-700">
                Student ID
              </label>
              <input
                id="student-id"
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="e.g. STU-001"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Start Learning
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <StudentContext.Provider value={{ student, clearStudent }}>
      {children}
    </StudentContext.Provider>
  );
}
