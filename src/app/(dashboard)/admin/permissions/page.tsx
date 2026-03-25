"use client";

import { useEffect, useState } from "react";
import styles from "./Permissions.module.css";
import { useSession } from "next-auth/react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Permission = {
  id: string;
  name: string;
  description: string;
};

export default function PermissionsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  
  const [users, setUsers] = useState<User[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  
  // Maps userId to array of Permission objects
  const [userPermsMap, setUserPermsMap] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch users and global permissions list
      const [usersRes, permsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/permissions")
      ]);
      
      if (usersRes.ok && permsRes.ok) {
        const usersData = await usersRes.json();
        const permsData = await permsRes.json();
        setUsers(usersData);
        setAllPermissions(permsData);

        // Fetch permissions for each user (Not highly scalable but fine for this phase)
        const newPermsMap: Record<string, Permission[]> = {};
        for (const u of usersData) {
          const upRes = await fetch(`/api/users/${u.id}/permissions`);
          if (upRes.ok) {
            newPermsMap[u.id] = await upRes.json();
          } else {
            newPermsMap[u.id] = [];
          }
        }
        setUserPermsMap(newPermsMap);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: User) => {
    setSelectedUser(user);
    const existingPerms = userPermsMap[user.id] || [];
    setSelectedPermIds(new Set(existingPerms.map(p => p.id)));
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    const newSet = new Set(selectedPermIds);
    if (newSet.has(permId)) {
      newSet.delete(permId);
    } else {
      newSet.add(permId);
    }
    setSelectedPermIds(newSet);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    
    try {
      const permsArray = Array.from(selectedPermIds);
      const res = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: permsArray })
      });
      
      if (res.ok) {
        // Update local state map mapping
        const assignedObjs = allPermissions.filter(p => selectedPermIds.has(p.id));
        setUserPermsMap(prev => ({ ...prev, [selectedUser.id]: assignedObjs }));
        setIsModalOpen(false);
      } else {
        alert("Fallo al guardar los permisos");
      }
    } catch (e) {
      console.error(e);
      alert("Error guardando permisos");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando permisos...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Roles y Permisos</h2>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Usuario</th>
              <th className={styles.th}>Rol Embebido</th>
              <th className={styles.th}>Permisos Granulares Asignados</th>
              {isAdmin && <th className={styles.th}>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const perms = userPermsMap[user.id] || [];
              return (
                <tr key={user.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{user.name}</div>
                    <div style={{ fontSize: "0.75rem", marginTop: "0.1rem" }}>{user.email}</div>
                  </td>
                  <td className={styles.td}>
                    <span style={{ fontWeight: 600 }}>{user.role}</span>
                  </td>
                  <td className={styles.td}>
                    {perms.length === 0 ? (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>Sin permisos específicos</span>
                    ) : (
                      <div className={styles.permissionsList}>
                        {perms.map(p => (
                          <span key={p.id} className={styles.permissionTag}>
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className={styles.td}>
                      <button className={styles.editBtn} onClick={() => openModal(user)}>
                        Asignar Permisos
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Permisos de {selectedUser.name}</h3>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Selecciona qué capacidades tendrá este usuario independientemente de su rol principal.
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <div className={styles.checkboxList}>
              {allPermissions.map(perm => {
                const isSelected = selectedPermIds.has(perm.id);
                return (
                  <label 
                    key={perm.id} 
                    className={`${styles.checkboxItem} ${isSelected ? styles.selected : ""}`}
                  >
                    <input 
                      type="checkbox" 
                      className={styles.checkboxInput}
                      checked={isSelected}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <div className={styles.checkboxLabel}>
                      <span className={styles.permName}>{perm.name}</span>
                      <span className={styles.permDesc}>{perm.description || "Sin descripción"}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <button className={styles.submitBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar Permisos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
