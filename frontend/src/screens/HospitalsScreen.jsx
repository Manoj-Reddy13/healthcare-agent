import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns,
  Database,
  ExternalLink,
  Filter,
  Info,
  Layers,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useHealthcare } from '../context/HealthcareContext';
import { formatINR } from '../utils/formatters';

export default function HospitalsScreen({ onNavigate }) {
  const { city, setActiveHospitalDetails, setSelectedHospitalForBooking } = useHealthcare();

  // Statistics Metadata
  const [stats, setStats] = useState({
    total_hospitals: 30273,
    states_count: 36,
    districts_count: 578,
    data_source: "National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)",
    import_date: "2026-11-01"
  });

  // Filter Options Loaded from Backend
  const [filterOptions, setFilterOptions] = useState({
    states: [],
    districts: [],
    care_types: [],
    categories: [],
    popular_specialties: [],
    state_counts: {},
    district_counts: {}
  });

  // Query Parameters
  const [selectedState, setSelectedState] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedCareType, setSelectedCareType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [pincodeInput, setPincodeInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Results & UI State
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comparison State
  const [compareList, setCompareList] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);

  // Load dataset statistics once from database
  useEffect(() => {
    let isMounted = true;
    ApiClient.fetchHospitalStatistics().then((res) => {
      if (isMounted && res && res.total_hospitals) {
        setStats(res);
      }
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, []);

  // Load filter options (states, care types, categories) and scoped districts for the selected state
  useEffect(() => {
    let isMounted = true;
    const queryState = selectedState !== "All" ? selectedState : null;
    ApiClient.fetchHospitalFilters(queryState).then((opts) => {
      if (isMounted && opts) {
        setFilterOptions({
          states: opts.states || [],
          districts: opts.districts || [],
          care_types: opts.care_types || [],
          categories: opts.categories || [],
          popular_specialties: opts.popular_specialties || [],
          state_counts: opts.state_counts || {},
          district_counts: opts.district_counts || {}
        });
      }
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, [selectedState]);

  // Fetch Hospitals from Database
  const fetchHospitalsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.fetchImportedHospitals({
        page,
        pageSize,
        state: selectedState !== "All" ? selectedState : undefined,
        district: selectedDistrict !== "All" ? selectedDistrict : undefined,
        careType: selectedCareType !== "All" ? selectedCareType : undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        specialty: selectedSpecialty !== "All" ? selectedSpecialty : undefined,
        pincode: pincodeInput.trim() || undefined,
        search: searchKeyword.trim() || undefined,
        sortBy
      });

      if (res && res.hospitals) {
        setHospitals(res.hospitals);
        setTotalRecords(res.total ?? 0);
        setTotalPages(res.total_pages || Math.max(1, Math.ceil((res.total || 0) / pageSize)));
      } else {
        setHospitals([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load hospitals:", err);
      setError("Unable to connect to the hospital database. Please verify backend connection or try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedState, selectedDistrict, selectedCareType, selectedCategory, selectedSpecialty, pincodeInput, searchKeyword, sortBy]);

  useEffect(() => {
    fetchHospitalsList();
  }, [fetchHospitalsList]);

  // State Change handler: resets district and page
  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedDistrict("All");
    setPage(1);
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchHospitalsList();
  };

  const handleResetFilters = () => {
    setSelectedState("All");
    setSelectedDistrict("All");
    setSelectedCareType("All");
    setSelectedCategory("All");
    setSelectedSpecialty("All");
    setPincodeInput("");
    setSearchKeyword("");
    setSortBy("name_asc");
    setPage(1);
  };

  const toggleCompare = (hosp) => {
    const exists = compareList.find(item => item.id === hosp.id);
    if (exists) {
      setCompareList(compareList.filter(item => item.id !== hosp.id));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare up to 3 hospitals side-by-side.");
        return;
      }
      setCompareList([...compareList, hosp]);
    }
  };

  const formatPhone = (hosp) => {
    if (hosp.telephone && hosp.telephone !== "Not available") return hosp.telephone;
    if (hosp.mobile_number && hosp.mobile_number !== "Not available") return hosp.mobile_number;
    if (hosp.phone && hosp.phone !== "Not available") return hosp.phone;
    return "Not available";
  };

  const startIdx = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalRecords);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 mb-1">
            <Building2 className="w-4 h-4" />
            <span>National Healthcare Facilities Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Find the Right Hospital
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Discover verified healthcare facilities and compare clinical specialties, contacts, and services.
          </p>
        </div>

        {/* View Mode Toggle & Total Count Pill */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* List / Map View Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-teal-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === "map"
                  ? "bg-white text-teal-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>

          <span className="px-3.5 py-2 rounded-2xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 shrink-0">
            {totalRecords.toLocaleString()} Facilities
          </span>
        </div>
      </div>

      {/* 2. Structured Filter Workspace */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        
        {/* Top Search Line */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-teal-600 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search hospital name, address, or location..."
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
            />
          </div>

          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={pincodeInput}
              onChange={(e) => setPincodeInput(e.target.value)}
              placeholder="PIN Code (e.g. 500034)"
              maxLength={6}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Dynamic Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* State Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">State / Territory</label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="All">All States / UTs ({stats.total_hospitals.toLocaleString()})</option>
              {filterOptions.states.map((st) => {
                const count = filterOptions.state_counts?.[st];
                return (
                  <option key={st} value={st}>
                    {st} {count ? `(${count.toLocaleString()})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* District Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">District</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="All">
                {selectedState === "All" ? "All Districts" : `All in ${selectedState}`}
              </option>
              {filterOptions.districts.map((dst) => {
                const count = filterOptions.district_counts?.[dst];
                return (
                  <option key={dst} value={dst}>
                    {dst} {count ? `(${count.toLocaleString()})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Care Type Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Facility Type</label>
            <select
              value={selectedCareType}
              onChange={(e) => {
                setSelectedCareType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="All">All Facility Types</option>
              {filterOptions.care_types.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          {/* Ownership Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ownership</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="All">Public & Private</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Specialty Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Specialty</label>
            <select
              value={selectedSpecialty}
              onChange={(e) => {
                setSelectedSpecialty(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="All">All Clinical Specialties</option>
              {filterOptions.popular_specialties.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* 3. Results Header & Sorting Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="font-bold text-slate-800">
          {loading ? (
            <span>Querying verified hospital registry...</span>
          ) : (
            <span>
              Showing {startIdx.toLocaleString()}–{endIdx.toLocaleString()} of {totalRecords.toLocaleString()} Hospitals
              {selectedState !== "All" && <span className="text-teal-700 font-semibold ml-1">in {selectedState}</span>}
              {selectedDistrict !== "All" && <span className="text-slate-400 font-normal"> ({selectedDistrict})</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
            >
              <option value="name_asc">Hospital Name (A → Z)</option>
              <option value="name_desc">Hospital Name (Z → A)</option>
              <option value="district_asc">District Name</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium focus:outline-none"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchHospitalsList()}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="p-6 rounded-3xl bg-white border border-slate-200/80 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-200 rounded w-24" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && hospitals.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900">
              {selectedState !== "All"
                ? `No Hospitals Found in ${selectedState}`
                : "No Hospitals Match Filter Criteria"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No hospital records found in the registry for this combination of location, specialty, or search terms. Try clearing specific filters.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* 7. Map View Simulation (when ViewMode is 'map') */}
      {!loading && hospitals.length > 0 && viewMode === "map" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          {/* Map Canvas Visual */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-100 border border-slate-200 min-h-[420px] flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-md">
              <MapIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1 relative z-10">
              <h3 className="font-bold text-sm text-slate-900">Geographic Facilities Map</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Displaying {hospitals.filter(h => h.latitude && h.longitude).length} facilities with verified GPS coordinates in {selectedState !== "All" ? selectedState : "India"}.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center relative z-10 pt-2">
              {hospitals.slice(0, 6).map((h) => (
                <button
                  key={h.id}
                  onClick={() => setActiveHospitalDetails(h)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-500 text-[11px] font-bold text-slate-800 shadow-2xs flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span className="truncate max-w-[140px]">{h.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick List Alongside Map */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              Nearby Facilities List
            </div>
            {hospitals.map((h) => (
              <div
                key={h.id}
                onClick={() => setActiveHospitalDetails(h)}
                className="p-3 rounded-2xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/20 cursor-pointer transition-all space-y-1 text-xs"
              >
                <div className="font-bold text-slate-900 truncate">{h.name}</div>
                <div className="text-[11px] text-slate-500">{h.district}, {h.state}</div>
                <div className="text-[10px] text-teal-700 font-semibold">{h.care_type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Clean Horizontal Hospital Result Cards (List View) */}
      {!loading && hospitals.length > 0 && viewMode === "list" && (
        <div className="space-y-4">
          {hospitals.map((hosp) => {
            const isGov = (hosp.category || hosp.hospital_type || "").toLowerCase().includes("public") ||
              (hosp.category || hosp.hospital_type || "").toLowerCase().includes("government") ||
              hosp.name.toLowerCase().includes("government") ||
              hosp.name.toLowerCase().includes("nims");

            const isCompared = compareList.some(item => item.id === hosp.id);
            const phone = formatPhone(hosp);
            const mapsUrl = hosp.directions_url ||
              (hosp.latitude && hosp.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${hosp.latitude},${hosp.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + " " + (hosp.district || hosp.state || ""))}`);

            const hasSpecialties = hosp.specialties && hosp.specialties.length > 0;

            return (
              <div
                key={hosp.id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col md:flex-row items-start justify-between gap-5"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  
                  {/* Facility Icon */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 shadow-2xs">
                    <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>

                  {/* Body */}
                  <div className="space-y-2 flex-1 min-w-0">
                    
                    {/* Header Chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {hosp.name}
                      </h3>

                      {isGov ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Public / Government
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {hosp.category || hosp.hospital_type || "Private"}
                        </span>
                      )}

                      {hosp.care_type && hosp.care_type !== "Not available" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {hosp.care_type}
                        </span>
                      )}

                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Accreditation: Not available
                      </span>
                    </div>

                    {/* Address & Direction Link */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{hosp.address || `${hosp.district}, ${hosp.state}`}</span>
                      {hosp.pincode && hosp.pincode !== "Not available" && (
                        <span className="font-bold text-slate-700">
                          (PIN: {hosp.pincode})
                        </span>
                      )}
                      <span className="text-slate-400">
                        • {hosp.district}, {hosp.state}
                      </span>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-teal-600 hover:underline flex items-center gap-1 ml-1"
                      >
                        <Navigation className="w-3 h-3 text-teal-600" />
                        <span>Map</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    {/* Specialty Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {hasSpecialties ? (
                        hosp.specialties.slice(0, 4).map((spec) => (
                          <span
                            key={spec}
                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700"
                          >
                            {spec}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Specialties not recorded in registry
                        </span>
                      )}
                      {hosp.specialties && hosp.specialties.length > 4 && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          +{hosp.specialties.length - 4} more
                        </span>
                      )}
                    </div>

                    {/* Registry Attribution */}
                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3">
                      <span>Source: NHP Open Data Registry ({hosp.import_date || '2026-11-01'})</span>
                      {hosp.total_beds && (
                        <span className="font-semibold text-slate-700">
                          • {hosp.total_beds} Total Beds
                        </span>
                      )}
                    </div>

                  </div>

                </div>

                {/* Right: Actions, Phone & Compare */}
                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  
                  {/* Phone */}
                  <div className="text-xs">
                    {phone !== "Not available" ? (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-teal-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>{phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">Phone: Not available</span>
                    )}
                  </div>

                  {/* Compare Toggle */}
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => toggleCompare(hosp)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Compare</span>
                  </label>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveHospitalDetails(hosp)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setSelectedHospitalForBooking(hosp)}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      Contact
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 9. Floating Side-by-Side Comparison Dock */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white rounded-2xl shadow-2xl border border-slate-200 px-5 py-3 flex items-center gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
              {compareList.length}
            </span>
            <span className="text-xs font-bold text-slate-800">
              Hospitals selected to compare (Max 3)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (compareList.length < 2) {
                  alert("Please select at least 2 hospitals to compare.");
                  return;
                }
                setIsCompareOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare Side-by-Side</span>
            </button>
            <button
              onClick={() => setCompareList([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 10. Side-by-Side Comparison Modal */}
      {isCompareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsCompareOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-teal-600 mb-1">
                  <Columns className="w-4 h-4" />
                  <span>Hospital Benchmarking Matrix</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Side-by-Side Facility Comparison
                </h2>
                <p className="text-xs text-slate-500">
                  Comparing verified location, specialties, category, and facilities across chosen hospitals.
                </p>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {compareList.map((h) => (
                <div key={h.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {h.category || h.hospital_type || 'Hospital'}
                    </span>
                    <h3 className="font-black text-base text-slate-900 pt-1 leading-snug">
                      {h.name}
                    </h3>
                    <p className="text-slate-500">{h.district}, {h.state}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Care Type:</span>
                      <span className="font-bold text-slate-800">{h.care_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Beds:</span>
                      <span className="font-bold text-slate-800">{h.total_beds || 'Not available'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PIN Code:</span>
                      <span className="font-bold text-slate-800">{h.pincode || 'Not available'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contact:</span>
                      <span className="font-bold text-teal-700">{formatPhone(h)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-200 pt-3">
                    <span className="font-bold text-slate-400 text-[10px] uppercase">Specialties:</span>
                    <div className="flex gap-1 flex-wrap">
                      {h.specialties && h.specialties.length > 0 ? (
                        h.specialties.slice(0, 4).map((spec) => (
                          <span key={spec} className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-medium">
                            {spec}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Specialties not recorded</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setIsCompareOpen(false);
                        setActiveHospitalDetails(h);
                      }}
                      className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-center text-slate-800 shadow-2xs"
                    >
                      View Full Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
          <div className="text-slate-500">
            Page <span className="font-bold text-slate-900">{page}</span> of{" "}
            <span className="font-bold text-slate-900">{totalPages.toLocaleString()}</span>{" "}
            ({totalRecords.toLocaleString()} total facilities)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold">
              {page}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
