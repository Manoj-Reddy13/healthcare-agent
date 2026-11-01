import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns,
  ExternalLink,
  Filter,
  Heart,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR } from '../utils/formatters';

const SPECIALTIES_LIST = [
  "All",
  "Cardiology",
  "Orthopedics",
  "Oncology",
  "Neurology",
  "Nephrology",
  "General Medicine",
  "Pediatrics",
  "Emergency Medicine"
];

export default function HospitalsScreen({ onNavigate }) {
  const { city, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Top Search Bar Filters
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [selectedDistance, setSelectedDistance] = useState("10");
  const [selectedType, setSelectedType] = useState("All");
  const [searchKeyword, setSearchKeyword] = useState("");

  // Left Sidebar Multi-select Filters
  const [typeFilters, setTypeFilters] = useState({
    Government: false,
    Private: false,
    Trust: false
  });

  const [accreditationFilters, setAccreditationFilters] = useState({
    NABH: false,
    NABL: false,
    JCI: false
  });

  const [schemeFilters, setSchemeFilters] = useState({
    "Ayushman Bharat (PM-JAY)": false,
    "Aarogyasri": false,
    "CGHS": false,
    "ESIC": false
  });

  const [sortBy, setSortBy] = useState("relevance");

  // Comparison State
  const [compareList, setCompareList] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareProcedure, setCompareProcedure] = useState("Angioplasty");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.fetchHospitals({
        city,
        specialty: selectedSpecialty !== "All" ? selectedSpecialty : undefined
      });
      setHospitals(data.hospitals || []);
    } catch (err) {
      setError("Unable to load hospitals. Using regional verified backup fixtures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [city, selectedSpecialty]);

  // Derived filtered & sorted list
  const filteredHospitals = useMemo(() => {
    let list = [...hospitals];

    // Search keyword / PIN code filter
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      list = list.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.pincode && h.pincode.includes(q)) ||
        (h.locality && h.locality.toLowerCase().includes(q)) ||
        h.specialties?.some(s => s.toLowerCase().includes(q))
      );
    }

    // Distance filter
    if (selectedDistance !== "all") {
      const maxDist = parseFloat(selectedDistance);
      list = list.filter(h => (h.distance_km || 5) <= maxDist);
    }

    // Top Dropdown Type filter
    if (selectedType !== "All") {
      list = list.filter(h => {
        const hType = (h.hospital_type || (h.name.toLowerCase().includes("nims") || h.name.toLowerCase().includes("government") ? "Government" : "Private")).toLowerCase();
        return hType === selectedType.toLowerCase();
      });
    }

    // Left Sidebar Type Checkboxes
    const activeTypes = Object.entries(typeFilters).filter(([_, v]) => v).map(([k]) => k.toLowerCase());
    if (activeTypes.length > 0) {
      list = list.filter(h => {
        const hType = (h.hospital_type || (h.name.toLowerCase().includes("nims") || h.name.toLowerCase().includes("government") ? "Government" : "Private")).toLowerCase();
        return activeTypes.includes(hType);
      });
    }

    // Accreditation checkboxes
    const activeAcc = Object.entries(accreditationFilters).filter(([_, v]) => v).map(([k]) => k);
    if (activeAcc.length > 0) {
      list = list.filter(h =>
        activeAcc.every(acc => h.accreditation?.includes(acc))
      );
    }

    // Scheme checkboxes
    const activeSchemes = Object.entries(schemeFilters).filter(([_, v]) => v).map(([k]) => k);
    if (activeSchemes.length > 0) {
      list = list.filter(h =>
        activeSchemes.some(sch => h.accepted_schemes?.some(s => s.toLowerCase().includes(sch.toLowerCase())))
      );
    }

    // Sorting
    if (sortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "distance") {
      list.sort((a, b) => (a.distance_km || 99) - (b.distance_km || 99));
    }

    return list;
  }, [hospitals, searchKeyword, selectedDistance, selectedType, typeFilters, accreditationFilters, schemeFilters, sortBy]);

  const handleResetFilters = () => {
    setSelectedSpecialty("All");
    setSelectedDistance("all");
    setSelectedType("All");
    setSearchKeyword("");
    setTypeFilters({ Government: false, Private: false, Trust: false });
    setAccreditationFilters({ NABH: false, NABL: false, JCI: false });
    setSchemeFilters({
      "Ayushman Bharat (PM-JAY)": false,
      "Aarogyasri": false,
      "CGHS": false,
      "ESIC": false
    });
    setSortBy("relevance");
  };

  const toggleCompare = (hospitalId) => {
    if (compareList.includes(hospitalId)) {
      setCompareList(compareList.filter(id => id !== hospitalId));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare up to 3 hospitals simultaneously.");
        return;
      }
      setCompareList([...compareList, hospitalId]);
    }
  };

  const openComparisonModal = async () => {
    if (compareList.length < 2) {
      alert("Please select at least 2 hospitals to compare.");
      return;
    }
    const res = await ApiClient.compareHospitals(compareList, compareProcedure);
    setCompareData(res);
    setIsCompareOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <Building2 className="w-4 h-4" />
            <span>Hospital Discovery & Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Find & Compare Hospitals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Search accredited hospitals by locality, PIN code, medical specialty, and verified government scheme empanelment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {compareList.length > 0 && (
            <button
              onClick={openComparisonModal}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare Selected ({compareList.length}/3)</span>
            </button>
          )}
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
            {filteredHospitals.length} Facilities
          </span>
        </div>
      </div>

      {/* 2. Top Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Location / Keyword / PIN Input */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={`Locality or PIN (e.g., 500033)...`}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Specialty Dropdown */}
          <div>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {SPECIALTIES_LIST.map((spec) => (
                <option key={spec} value={spec}>
                  {spec === "All" ? "All Specialties" : spec}
                </option>
              ))}
            </select>
          </div>

          {/* Distance Dropdown */}
          <div>
            <select
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="all">Any Distance</option>
            </select>
          </div>

          {/* Hospital Type Dropdown */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Hospital Types</option>
              <option value="Government">Government / Autonomous</option>
              <option value="Private">Private Corporate</option>
              <option value="Trust">Trust & Institutes</option>
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={() => loadData()}
            className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

        </div>
      </div>

      {/* 3. Main Body: Left Filters Sidebar + Right Hospital Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Filter Panel */}
        <aside className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Filters</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Type Filter */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hospital Type</h4>
            {Object.keys(typeFilters).map((type) => (
              <label key={type} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={typeFilters[type]}
                    onChange={(e) => setTypeFilters({ ...typeFilters, [type]: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>{type}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Accreditation Filter */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Accreditation</h4>
            {Object.keys(accreditationFilters).map((acc) => (
              <label key={acc} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={accreditationFilters[acc]}
                    onChange={(e) => setAccreditationFilters({ ...accreditationFilters, [acc]: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>{acc}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Scheme Empanelment */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Supported Schemes</h4>
            {Object.keys(schemeFilters).map((sch) => (
              <label key={sch} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={schemeFilters[sch]}
                    onChange={(e) => setSchemeFilters({ ...schemeFilters, [sch]: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>{sch}</span>
                </span>
              </label>
            ))}
          </div>
        </aside>

        {/* Right Hospital Cards List */}
        <main className="lg:col-span-3 space-y-4">
          
          {/* Results Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              <span>{filteredHospitals.length} Hospitals Found</span>
              <span className="text-slate-400 font-normal ml-1">in {city}</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-slate-400 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Rating: High to Low</option>
                <option value="distance">Distance: Nearest</option>
              </select>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredHospitals.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">No Hospitals Match Filter Criteria</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try relaxing your distance range, selecting "All Specialties", or clearing specific scheme filters.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Hospital Cards */}
          {!loading && filteredHospitals.map((hosp) => {
            const isGov = (hosp.hospital_type || "").toLowerCase() === "government" || hosp.name.toLowerCase().includes("nims") || hosp.name.toLowerCase().includes("government");
            const isCompared = compareList.includes(hosp.id);
            const mapsUrl = hosp.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + " " + hosp.address)}`;

            return (
              <div
                key={hosp.id}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-start justify-between gap-5"
              >
                {/* Left: Thumbnail & Core Info */}
                <div className="flex items-start gap-4 flex-1">
                  
                  {/* Hospital Icon/Image Badge */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center shrink-0 border border-slate-700 shadow-sm">
                    <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                  </div>

                  {/* Hospital Details */}
                  <div className="space-y-2 flex-1">
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                        {hosp.name}
                      </h3>

                      {isGov ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                          Government
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                          {hosp.hospital_type || "Private"}
                        </span>
                      )}

                      {hosp.accreditation?.map((acc) => (
                        <span
                          key={acc}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                        >
                          {acc}
                        </span>
                      ))}
                    </div>

                    {/* Location, PIN & Google Maps Link */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{hosp.address}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ({hosp.distance_km || 4.5} km)
                      </span>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 ml-1"
                      >
                        <Navigation className="w-3 h-3 text-emerald-500" />
                        <span>Map Directions</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    {/* Key Specialties Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {hosp.specialties?.slice(0, 5).map((spec) => (
                        <span
                          key={spec}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Schemes Supported */}
                    <div className="flex items-center gap-2 flex-wrap pt-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-400">Schemes:</span>
                      {hosp.accepted_schemes?.map((sch) => (
                        <span
                          key={sch}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          <span>{sch}</span>
                        </span>
                      ))}
                    </div>

                  </div>

                </div>

                {/* Right: Actions, Compare & Phone */}
                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  
                  {/* Rating Badge */}
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{hosp.rating?.toFixed(1) || '4.5'}</span>
                  </div>

                  {/* Phone */}
                  <a
                    href={`tel:${hosp.phone || '+914023607777'}`}
                    className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold hover:text-emerald-600 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{hosp.phone || '040-2360 7777'}</span>
                  </a>

                  {/* Compare Toggle */}
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => toggleCompare(hosp.id)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Compare</span>
                  </label>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveHospitalDetails(hosp)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setSelectedHospitalForBooking(hosp)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      Book Demo
                    </button>
                  </div>

                </div>

              </div>
            );
          })}

        </main>

      </div>

      {/* 4. Side-by-Side Comparison Modal */}
      {isCompareOpen && compareData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCompareOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-teal-600 mb-1">
                  <Columns className="w-4 h-4" />
                  <span>Hospital Benchmarking</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Side-by-Side Hospital Comparison
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare quality accreditations, treatment costs, and public scheme acceptance across chosen facilities.
                </p>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {compareData.hospitals.map((h) => (
                <div
                  key={h.hospital_id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4 text-xs"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {h.hospital_type}
                    </span>
                    <h3 className="font-black text-base text-slate-900 dark:text-white pt-1">
                      {h.name}
                    </h3>
                    <p className="text-slate-500">{h.locality}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rating:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{h.rating} ★</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{h.distance_km} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Consultation Fee:</span>
                      <span className="font-bold text-emerald-600">{formatINR(h.doctor_consultation_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{h.procedure} Est.:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatINR(h.indicative_cost)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3">
                    <span className="font-bold text-slate-400 text-[10px] uppercase">Accreditations:</span>
                    <div className="flex gap-1 flex-wrap">
                      {h.accreditation?.map((acc) => (
                        <span key={acc} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3">
                    <span className="font-bold text-slate-400 text-[10px] uppercase">Schemes:</span>
                    <div className="flex gap-1 flex-wrap">
                      {h.empanelled_schemes?.map((sch) => (
                        <span key={sch} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          {sch}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={h.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold text-center block text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              * Comparative benchmarks derived from regional tariff registries. Actual charges vary with clinical necessity.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
