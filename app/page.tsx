"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  Phone,
  MapPin,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Utensils,
  MessageCircle,
  Search,
  X,
} from "lucide-react";

interface Subscriber {
  id: string;
  name: string;
  phone: string;
  address: string;
  mapsUrl?: string;
  mealSlot: "LUNCH" | "DINNER" | "BOTH";
  daysRemaining: number;
  isPaused: boolean;
  notes?: string;
}

export default function TiffinTracker() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "EXPIRING">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    mapsUrl: "",
    mealSlot: "LUNCH" as "LUNCH" | "DINNER" | "BOTH",
    daysRemaining: 30,
    notes: "",
  });

  useEffect(() => {
    const q = query(collection(db, "subscribers"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subscriber[];
      setSubscribers(docs);
    });
    return () => unsubscribe();
  }, []);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.trim();
    const cleanAddress = formData.address.trim();

    if (!cleanName || !cleanPhone || !cleanAddress) {
      alert("Name, Phone Number, and Address are strictly required.");
      return;
    }

    await addDoc(collection(db, "subscribers"), {
      name: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      mapsUrl: formData.mapsUrl.trim(),
      mealSlot: formData.mealSlot,
      daysRemaining: Number(formData.daysRemaining) || 0,
      notes: formData.notes.trim(),
      isPaused: false,
    });

    setFormData({
      name: "",
      phone: "",
      address: "",
      mapsUrl: "",
      mealSlot: "LUNCH",
      daysRemaining: 30,
      notes: "",
    });
    setShowModal(false);
  };

  const togglePause = async (sub: Subscriber) => {
    const ref = doc(db, "subscribers", sub.id);
    await updateDoc(ref, { isPaused: !sub.isPaused });
  };

  const renewPlan = async (sub: Subscriber, daysToAdd: number) => {
    const ref = doc(db, "subscribers", sub.id);
    await updateDoc(ref, { daysRemaining: sub.daysRemaining + daysToAdd });
  };

  const deductDay = async (sub: Subscriber) => {
    if (sub.daysRemaining <= 0) return;
    const ref = doc(db, "subscribers", sub.id);
    await updateDoc(ref, { daysRemaining: sub.daysRemaining - 1 });
  };

  const deleteSubscriber = async (id: string) => {
    if (confirm("Are you sure you want to remove this subscriber?")) {
      await deleteDoc(doc(db, "subscribers", id));
    }
  };

  const activeLunches = subscribers.filter(
    (s) => !s.isPaused && s.daysRemaining > 0 && (s.mealSlot === "LUNCH" || s.mealSlot === "BOTH")
  ).length;

  const activeDinners = subscribers.filter(
    (s) => !s.isPaused && s.daysRemaining > 0 && (s.mealSlot === "DINNER" || s.mealSlot === "BOTH")
  ).length;

  const expiringSoonCount = subscribers.filter(
    (s) => s.daysRemaining > 0 && s.daysRemaining <= 3
  ).length;

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.phone.includes(searchTerm) ||
      sub.address.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "ACTIVE") return !sub.isPaused && sub.daysRemaining > 0;
    if (filter === "PAUSED") return sub.isPaused;
    if (filter === "EXPIRING") return sub.daysRemaining > 0 && sub.daysRemaining <= 3;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6" />
            <h1 className="text-xl font-bold">Golaghat Tiffin</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-emerald-800 p-2 rounded-full font-semibold shadow hover:bg-slate-100 transition"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">Lunch Today</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{activeLunches}</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">Dinner Today</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{activeDinners}</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">Expiring &le;3d</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{expiringSoonCount}</div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-medium">
          {(["ALL", "ACTIVE", "PAUSED", "EXPIRING"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                filter === tab
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tab === "EXPIRING" ? "Expiring Soon" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No subscribers found under this filter.
            </div>
          ) : (
            filteredSubscribers.map((sub) => (
              <div
                key={sub.id}
                className={`bg-white rounded-xl p-4 border shadow-sm transition ${
                  sub.isPaused
                    ? "border-amber-300 bg-amber-50/30 opacity-80"
                    : sub.daysRemaining <= 3
                    ? "border-red-300"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-base text-slate-900">{sub.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                        {sub.mealSlot}
                      </span>
                      {sub.isPaused ? (
                        <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                          PAUSED TODAY
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            sub.daysRemaining <= 0
                              ? "bg-red-100 text-red-700"
                              : sub.daysRemaining <= 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {sub.daysRemaining} days left
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteSubscriber(sub.id)}
                    className="text-slate-300 hover:text-red-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-slate-800">{sub.address}</span>
                    {sub.mapsUrl && (
                      <a
                        href={sub.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline shrink-0 font-medium ml-auto"
                      >
                        Map Pin
                      </a>
                    )}
                  </div>
                  {sub.notes && (
                    <div className="text-xs text-slate-500 italic pl-6">
                      Note: {sub.notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    <a
                      href={`tel:${sub.phone}`}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      title="Call"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://wa.me/${sub.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(
                        sub.name
                      )},%20your%20tiffin%20subscription%20has%20${sub.daysRemaining}%20meals%20remaining.`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => togglePause(sub)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 border transition ${
                        sub.isPaused
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {sub.isPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5" /> Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5" /> Skip/Pause
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => deductDay(sub)}
                      disabled={sub.isPaused || sub.daysRemaining <= 0}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition"
                      title="Deduct 1 day after meal is served"
                    >
                      -1 Day
                    </button>

                    <button
                      onClick={() => renewPlan(sub, 30)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition"
                      title="Add 30 days"
                    >
                      <RefreshCw className="h-3 w-3" /> +30d
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New Subscriber</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubscriber} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Abhay"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Address / Office / PG Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. DC Office complex, Room 4 / DR College Boys PG"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Google Maps Pin Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://maps.app.goo.gl/..."
                  value={formData.mapsUrl}
                  onChange={(e) => setFormData({ ...formData, mapsUrl: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Meal Slot
                  </label>
                  <select
                    value={formData.mealSlot}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mealSlot: e.target.value as "LUNCH" | "DINNER" | "BOTH",
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none"
                  >
                    <option value="LUNCH">Lunch Only</option>
                    <option value="DINNER">Dinner Only</option>
                    <option value="BOTH">Lunch & Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Days Purchased
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.daysRemaining}
                    onChange={(e) =>
                      setFormData({ ...formData, daysRemaining: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Delivery Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call before delivery, leave at desk"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl mt-4 transition"
              >
                Save Subscriber
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}