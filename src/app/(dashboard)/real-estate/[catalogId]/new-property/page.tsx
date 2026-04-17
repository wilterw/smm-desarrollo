"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../RealEstate.module.css";

export default function NewPropertyPage({ params }: { params: { catalogId: string } }) {
  const router = useRouter();
  const catalogId = params.catalogId;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "EUR",
    availability: "for_sale",
    address: "",
    city: "",
    state: "",
    country: "ES",
    propertyType: "house",
    bedrooms: "",
    bathrooms: "",
    areaSqm: "",
    imageUrl: "",
    listingUrl: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/real-estate/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, catalogId }),
      });

      if (res.ok) {
        router.push(`/real-estate/${catalogId}`);
      } else {
        const err = await res.json();
        setError(err.error || "Error al crear la propiedad");
        setSaving(false);
      }
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "3rem" }}>
      <Link href={`/real-estate/${catalogId}`} className={styles.backBtn}>
        ← Volver al Catálogo
      </Link>
      
      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h2 className={styles.title} style={{ marginBottom: "2rem" }}>Añadir Ítem (Producto / Inmueble)</h2>

        {error && <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Título Corto (Obligatorio)</label>
              <input type="text" name="name" className={styles.input} value={formData.name} onChange={handleChange} required />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Disponibilidad</label>
              <select name="availability" className={styles.input} value={formData.availability} onChange={handleChange}>
                <option value="for_sale">En Venta</option>
                <option value="for_rent">En Alquiler</option>
                <option value="sale_pending">Venta Pendiente</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Precio (Obligatorio)</label>
              <input type="number" name="price" className={styles.input} value={formData.price} onChange={handleChange} required min="0" step="0.01" />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Moneda</label>
              <input type="text" name="currency" className={styles.input} value={formData.currency} onChange={handleChange} maxLength={3} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción</label>
            <textarea name="description" className={styles.input} value={formData.description} onChange={handleChange} required rows={3} />
          </div>

          <h3 style={{ fontSize: "1.1rem", marginTop: "1rem", color: "var(--accent-primary)" }}>📍 Ubicación</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>Dirección exacta (Obligatorio para Meta)</label>
              <input type="text" name="address" className={styles.input} value={formData.address} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Ciudad (Obligatorio)</label>
              <input type="text" name="city" className={styles.input} value={formData.city} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Provincia/Estado</label>
              <input type="text" name="state" className={styles.input} value={formData.state} onChange={handleChange} />
            </div>
          </div>

          <h3 style={{ fontSize: "1.1rem", marginTop: "1rem", color: "var(--accent-primary)" }}>📷 Multimedia y Enlaces</h3>
          <div className={styles.formGroup}>
            <label className={styles.label}>URL Imagen Principal (Obligatorio)</label>
            <input type="url" name="imageUrl" className={styles.input} value={formData.imageUrl} onChange={handleChange} required placeholder="https://..." />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>URL Landing Page del Inmueble</label>
            <input type="url" name="listingUrl" className={styles.input} value={formData.listingUrl} onChange={handleChange} placeholder="https://..." />
          </div>

          <div className={styles.actions}>
            <Link href={`/real-estate/${catalogId}`} className={styles.btnCancel}>
              Cancelar
            </Link>
            <button type="submit" className={styles.btnSubmit} disabled={saving || !formData.name}>
              {saving ? "Guardando..." : "Guardar Ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
