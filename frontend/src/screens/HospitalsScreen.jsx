import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Filter,
  Info,
  Layers,
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

  // Statistics & Provenance Metadata (loaded dynamically from API)
  const [stats, setStats] = useState({
    total_hospitals: 30273,
    states_count: 36,
    districts_count: 578,
    hospitals_with_phone: 1732,
    hospitals_with_coordinates: 10843,
    hospitals_with_specialties: 990,
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

  // Active Query Parameters (Default to All States or clean selection)
  const [selectedState, setSelectedState] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedCareType, setSelectedCareType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [pincodeInput, setPincodeInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Results & UI State
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dataset statistics once from real database API
  useEffect(() => {
    let isMounted = true;
    ApiClient.fetchHospitalStatistics().then((res) => {
      if (isMounted && res && res.total_hospitals) {
        setStats(res);
      }
    }).catch(console.warn);
    return () => { isMounted = false; };
  }, []);

  // Load filter options (states, care types, categories) and districts for the selected state
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

  // Reset page to 1 and clear invalid district when state changes
  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedDistrict("All");
    setPage(1);
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setPage(1);
  };

  const handleCareTypeChange = (e) => {
    setSelectedCareType(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleSpecialtyChange = (e) => {
    setSelectedSpecialty(e.target.value);
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

  const formatPhone = (hosp) => {
    if (hosp.telephone && hosp.telephone !== "Not available") return hosp.telephone;
    if (hosp.mobile_number && hosp.mobile_number !== "Not available") return hosp.mobile_number;
    if (hosp.phone && hosp.phone !== "Not available") return hosp.phone;
    return "Not available";
  };

  const startIdx = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalRecords);

  return (
    <div className="space-y-6 pb-20">

      {/* 1. Header & Dataset Provenance Banner */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span>National Healthcare Directory & Facilities Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Hospital Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Verified registry of {stats.total_hospitals.toLocaleString()} public and private healthcare facilities across India from the National Health Portal (MoHFW).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-sm">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{stats.total_hospitals.toLocaleString()} Registered Facilities</span>
            </span>
          </div>
        </div>

        {/* Provenance Strip */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>Verified Data Source:</strong> {stats.data_source} (Import Date: {stats.import_date})
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span><strong>36</strong> States & UTs</span>
            <span><strong>{stats.districts_count}</strong> Documented Districts</span>
            <span>Unrecorded ratings & accreditations shown as <em>"Not available"</em></span>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Top Search Form */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Free Text Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search hospital name, address, or location..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* PIN Code Search */}
          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={pincodeInput}
              onChange={(e) => setPincodeInput(e.target.value)}
              placeholder="PIN Code (e.g. 500034)"
              maxLength={6}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Database</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </form>

        {/* Structured Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* State Dropdown with Real Database Counts */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">State / UT</label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

          {/* District Dropdown (dynamically scoped to selected state) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">District</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">
                {selectedState === "All" ? "All Districts" : `All Districts in ${selectedState}`}
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

          {/* Care Type Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Facility Type</label>
            <select
              value={selectedCareType}
              onChange={handleCareTypeChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Facility Types</option>
              {filterOptions.care_types.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ownership</label>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">Public & Private</option>
              {filterOptions.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Specialty Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Specialty</label>
            <select
              value={selectedSpecialty}
              onChange={handleSpecialtyChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Specialties</option>
              {filterOptions.popular_specialties.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* 3. Results Header & Sorting Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="font-bold text-slate-800 dark:text-slate-200">
          {loading ? (
            <span>Querying verified hospital registry...</span>
          ) : (
            <span>
              Showing {startIdx.toLocaleString()}–{endIdx.toLocaleString()} of {totalRecords.toLocaleString()} Hospitals
              {selectedState !== "All" && <span className="text-emerald-600 font-semibold ml-1">in {selectedState}</span>}
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
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
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
              className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium focus:outline-none"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchHospitalsList()}
            className="px-3 py-1.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && hospitals.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {selectedState !== "All"
                ? `No Hospitals Found in ${selectedState}`
                : "No Hospitals Match Current Filters"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No hospital records found in the registry for this combination of state, district, or filter criteria.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 7. Hospital Records List */}
      {!loading && hospitals.length > 0 && (
        <div className="space-y-4">
          {hospitals.map((hosp) => {
            const isGov = (hosp.category || hosp.hospital_type || "").toLowerCase().includes("public") ||
              (hosp.category || hosp.hospital_type || "").toLowerCase().includes("government") ||
              hosp.name.toLowerCase().includes("government") ||
              hosp.name.toLowerCase().includes("nims");

            const phone = formatPhone(hosp);
            const mapsUrl = hosp.directions_url ||
              (hosp.latitude && hosp.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${hosp.latitude},${hosp.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + " " + (hosp.district || hosp.state || ""))}`);

            const hasSpecialties = hosp.specialties && hosp.specialties.length > 0;

            return (
              <div
                key={hosp.id}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-start justify-between gap-5"
              >
                {/* Left: Thumbnail & Core Details */}
                <div className="flex items-start gap-4 flex-1">
                  
                  {/* Facility Icon / Badge */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center shrink-0 border border-slate-700 shadow-sm">
                    <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                  </div>

                  {/* Details Body */}
                  <div className="space-y-2 flex-1 min-w-0">
                    
                    {/* Header Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                        {hosp.name}
                      </h3>

                      {isGov ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                          Public / Government
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                          {hosp.category || hosp.hospital_type || "Private"}
                        </span>
                      )}

                      {hosp.care_type && hosp.care_type !== "Not available" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200">
                          {hosp.care_type}
                        </span>
                      )}

                      {/* Explicit Accreditation Status */}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500" title="Accreditation status unrecorded in open government registry">
                        Accreditation: Not available
                      </span>
                    </div>

                    {/* Location, District & PIN */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{hosp.address || `${hosp.district}, ${hosp.state}`}</span>
                      {hosp.pincode && hosp.pincode !== "Not available" && (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
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
                        className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 ml-1"
                      >
                        <Navigation className="w-3 h-3 text-emerald-500" />
                        <span>Map</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    {/* Specialties / Clinical Tag Strip */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {hasSpecialties ? (
                        hosp.specialties.slice(0, 4).map((spec) => (
                          <span
                            key={spec}
                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
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

                    {/* Data Provenance Attribution */}
                    <div className="text-[11px] text-slate-400 pt-1">
                      <span>Source: NHP Open Data Registry ({hosp.import_date || '2026-11-01'})</span>
                      {hosp.total_beds && (
                        <span className="ml-2 font-semibold text-slate-600 dark:text-slate-300">
                          • {hosp.total_beds} Total Beds
                        </span>
                      )}
                    </div>

                  </div>

                </div>

                {/* Right: Actions & Phone */}
                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  
                  {/* Phone */}
                  <div className="text-xs">
                    {phone !== "Not available" ? (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">Phone: Not available</span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveHospitalDetails(hosp)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setSelectedHospitalForBooking(hosp)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      Simulate Visit
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 8. Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
          <div className="text-slate-500">
            Page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-white">{totalPages.toLocaleString()}</span>{" "}
            ({totalRecords.toLocaleString()} total facilities)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              {page}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
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
