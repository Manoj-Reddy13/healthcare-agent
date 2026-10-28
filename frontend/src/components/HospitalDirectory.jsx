import React, { useState, useEffect } from 'react';
import { Building2, Filter, RotateCcw, Search } from 'lucide-react';
import { ApiClient } from '../api/client';
import HospitalCard from './HospitalCard';
import { formatINR } from '../utils/formatters';

const SPECIALTIES = [
  "All",
  "Cardiology",
  "Orthopedics",
  "Oncology",
  "Neurology",
  "General Medicine",
  "Pediatrics",
  "Emergency Medicine"
];

const SCHEMES = [
  "All",
  "Ayushman Bharat (PM-JAY)",
  "Aarogyasri",
  "CGHS",
  "ESIC"
];

export default function HospitalDirectory({ onSelectBookHospital }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Hyderabad');
  const [specialty, setSpecialty] = useState('All');
  const [scheme, setScheme] = useState('All');
  const [maxBudget, setMaxBudget] = useState('');

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetchHospitals({
        city: city || undefined,
        specialty: specialty !== 'All' ? specialty : undefined,
        scheme: scheme !== 'All' ? scheme : undefined,
        maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
      });
      setHospitals(data.hospitals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, [city, specialty, scheme, maxBudget]);

  const handleReset = () => {
    setCity('Hyderabad');
    setSpecialty('All');
    setScheme('All');
    setMaxBudget('');
  };

  return (
    <div className="space-y-6">
      
      {/* Directory Header Banner */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-semibold uppercase tracking-wider">
          <Building2 className="w-4 h-4" />
          <span>Accredited Healthcare Facilities Directory</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
          Find Hospitals by Specialty, Scheme & Budget
        </h2>
        <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Search tertiary care centers in Hyderabad and Bengaluru. Filter by NABH/JCI accreditations, accepted government welfare schemes, and benchmark procedure costs.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter Hospitals
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              City
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bengaluru">Bengaluru</option>
            </select>
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Specialty
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Scheme */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Accepted Scheme
            </label>
            <select
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {SCHEMES.map((sch) => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
            </select>
          </div>

          {/* Max Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Max Budget Ceiling (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 150000"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Showing <strong>{hospitals.length}</strong> verified and mock facilities in {city}</span>
        <span className="italic">Data mode: mock benchmark</span>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading hospital directory...
        </div>
      ) : hospitals.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">No Hospitals Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your specialty, scheme, or budget ceiling filters to view available facilities.
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hospitals.map((hosp) => (
            <HospitalCard
              key={hosp.id}
              hospital={hosp}
              onSelectBook={(selected) => onSelectBookHospital(selected)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
