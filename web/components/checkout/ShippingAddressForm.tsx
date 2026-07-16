"use client";

import { useState } from "react";
import { getAreas, getCities, getProvinces, PAKISTAN_LOCATIONS } from "@/lib/pakistanLocations";
import type { ShippingAddress } from "@/lib/types";

interface ShippingAddressFormProps {
  initial?: ShippingAddress | null;
  token: string;
  onSave: (addr: ShippingAddress) => void;
  onCancel: () => void;
}

export function ShippingAddressForm({ initial, token, onSave, onCancel }: ShippingAddressFormProps) {
  const provinces = getProvinces();

  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [streetAddress, setStreetAddress] = useState(initial?.streetAddress ?? "");
  const [landmark, setLandmark] = useState(initial?.landmark ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cities = province ? getCities(province) : [];
  const areas = province && city ? getAreas(province, city) : [];
  const deliveryFee = province && city ? PAKISTAN_LOCATIONS[province]?.[city]?.fee ?? 0 : 0;

  function handleProvinceChange(next: string) {
    setProvince(next);
    setCity("");
    setArea("");
  }

  function handleCityChange(next: string) {
    setCity(next);
    setArea("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phoneNumber.trim() || !province || !city || !area || !streetAddress.trim()) {
      setError("All fields except landmark are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/users/profile/address`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          province,
          city,
          area,
          streetAddress: streetAddress.trim(),
          landmark: landmark.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save address.");
      }

      const json = await res.json();
      onSave(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full Name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className={inputCls}
          />
        </Field>
        <Field label="Phone Number">
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+92 300 1234567"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Province">
          <select value={province} onChange={(e) => handleProvinceChange(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <select
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={!province}
            className={inputCls}
          >
            <option value="">Select…</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Area">
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            disabled={!city}
            className={inputCls}
          >
            <option value="">Select…</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Building / House No / Street">
        <input
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          placeholder="House 12, Street 4"
          className={inputCls}
        />
      </Field>

      <Field label="Colony / Landmark (optional)">
        <input
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="Near Jamia Mosque"
          className={inputCls}
        />
      </Field>

      {deliveryFee > 0 && (
        <div className="rounded-lg bg-oceanic/5 px-3 py-2 text-xs font-medium text-oceanic-dark">
          Delivery fee for {city}: PKR {deliveryFee}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-full bg-oceanic px-6 py-3 text-sm font-semibold text-white transition hover:bg-oceanic-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save & Continue"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-oceanic focus:ring-2 focus:ring-oceanic/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
