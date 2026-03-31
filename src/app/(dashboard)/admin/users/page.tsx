"use client";

import { useEffect, useState } from "react";
import styles from "./Users.module.css";
import { useSession } from "next-auth/react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  maxFacebookAccounts: number;
  maxInstagramAccounts: number;
  maxYouTubeAccounts: number;
  createdAt: string;
};

const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "VIEWER"];

export default function UsersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "VIEWER",
    maxFacebookAccounts: 1,
    maxInstagramAccounts: 1,
    maxYouTubeAccounts: 1
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = (user: User | null = null) => {
    setEditingUser(user);
    if (user) {
      setFormData({ 
        name: user.name || "", 
        email: user.email, 
        password: "", 
        role: user.role,
        maxFacebookAccounts: user.maxFacebookAccounts || 1,
        maxInstagramAccounts: user.maxInstagramAccounts || 1,
        maxYouTubeAccounts: user.maxYouTubeAccounts || 1
      });
    } else {
      setFormData({ 
        name: "", 
        email: "", 
        password: "", 
        role: "VIEWER",
        maxFacebookAccounts: 1,
        maxInstagramAccounts: 1,
        maxYouTubeAccounts: 1
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const isEditing = !!editingUser;
      const url = isEditing ? `/api/users/${editingUser.id}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";
      
      const payload: any = { ...formData };
      if (isEditing && !payload.password) {
        delete payload.password; // Don't send empty password if not changing
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Algo salió mal");
      }

      await fetchUsers();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar a este usuario?")) return;
    
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "No se pudo eliminar el usuario");
      } else {
        await fetchUsers();
      }
    } catch (e) {
      alert("Error eliminando usuario");
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case "SUPER_ADMIN": return <span className={`${styles.badge} ${styles.badgeSuperAdmin}`}>Super Admin</span>;
      case "ADMIN": return <span className={`${styles.badge} ${styles.badgeAdmin}`}>Admin</span>;
      case "EDITOR": return <span className={`${styles.badge} ${styles.badgeEditor}`}>Editor</span>;
      default: return <span className={`${styles.badge} ${styles.badgeViewer}`}>Viewer</span>;
    }
  };

  if (loading) return <div>Cargando usuarios...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Gestión de Usuarios</h2>
        {isAdmin && (
          <button className={styles.addButton} onClick={() => openModal(null)}>
            <span>+</span> Nuevo Usuario
          </button>
        )}
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Nombre</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Rol</th>
              <th className={styles.th}>Límites (FB/IG/YT)</th>
              <th className={styles.th}>Fecha Creación</th>
              {isAdmin && <th className={styles.th}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={styles.tr}>
                <td className={styles.td} style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {user.name || "Sin nombre"}
                </td>
                <td className={styles.td}>{user.email}</td>
                <td className={styles.td}>{getRoleBadge(user.role)}</td>
                <td className={styles.td}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {user.maxFacebookAccounts} FB / {user.maxInstagramAccounts} IG / {user.maxYouTubeAccounts} YT
                  </div>
                </td>
                <td className={styles.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                {isAdmin && (
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openModal(user)} title="Editar">
                        ✏️
                      </button>
                      <button 
                        className={`${styles.iconBtn} ${styles.iconBtnDelete}`} 
                        onClick={() => handleDelete(user.id)}
                        title="Eliminar"
                        disabled={user.id === session?.user?.id}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </h3>
              <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {error && <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{error}</div>}
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre completo</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input 
                  type="email" 
                  className={styles.input} 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                  disabled={!!editingUser} // Can't easily change email once created generally
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Contraseña {editingUser && <span style={{fontWeight: "normal", color: "var(--text-muted)"}}>(Dejar en blanco para no cambiar)</span>}
                </label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  required={!editingUser} 
                />
              </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Rol de Sistema</label>
                  <select 
                    className={styles.select}
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r} style={{ color: "var(--bg-primary)" }}>{r}</option>
                    ))}
                  </select>
                </div>

              <div style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.85rem", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>Límites de Cuentas Conectadas</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} style={{ fontSize: "0.7rem" }}>Facebook</label>
                    <input 
                      type="number" min="1" max="99" className={styles.input} 
                      value={formData.maxFacebookAccounts} 
                      onChange={(e) => setFormData({...formData, maxFacebookAccounts: Number(e.target.value)})} 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} style={{ fontSize: "0.7rem" }}>Instagram</label>
                    <input 
                      type="number" min="1" max="99" className={styles.input} 
                      value={formData.maxInstagramAccounts} 
                      onChange={(e) => setFormData({...formData, maxInstagramAccounts: Number(e.target.value)})} 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} style={{ fontSize: "0.7rem" }}>YouTube</label>
                    <input 
                      type="number" min="1" max="99" className={styles.input} 
                      value={formData.maxYouTubeAccounts} 
                      onChange={(e) => setFormData({...formData, maxYouTubeAccounts: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
