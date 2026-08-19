"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_LEVELS, ADMIN_MODULES } from "@/components/admin/adminConfig";
import {
  BookOpen,
  BarChart3,
  ChevronDown,
  Film,
  Languages,
  Mic2,
  ScrollText,
  Speech,
  Timer,
  Users,
} from "lucide-react";

const MODULE_ICONS = {
  vocabulary: BookOpen,
  kanji: Languages,
  grammar: ScrollText,
  reading: Speech,
  video: Film,
  speaking: Mic2,
};

function normalizePathname(pathname) {
  return String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
}

function isAdminModulePath(pathname, moduleKey) {
  const normalized = normalizePathname(pathname);
  return normalized === `/admin/${moduleKey}` || normalized.startsWith(`/admin/${moduleKey}/`);
}

function isAdminLevelPath(pathname, moduleKey, level) {
  const normalized = normalizePathname(pathname);
  const levelKey = String(level || "").toLowerCase();
  return normalized === `/admin/${moduleKey}/${levelKey}` || normalized.startsWith(`/admin/${moduleKey}/${levelKey}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const activeModule = pathname?.startsWith("/admin/tests")
    ? "tests"
    : ADMIN_MODULES.find((moduleItem) => pathname?.startsWith(`/admin/${moduleItem.key}`))?.key;
  const [openModule, setOpenModule] = useState(activeModule || ADMIN_MODULES[0]?.key || null);

  useEffect(() => {
    if (activeModule) {
      setOpenModule(activeModule);
    }
  }, [activeModule]);

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <span className="admin-logo-mark" />
        <strong>Quản trị J-Deki Go</strong>
      </div>

      <nav className="admin-module-list" aria-label="Mô-đun học tập">
        <article className={`admin-module-item ${pathname?.startsWith("/admin/users") ? "is-active" : ""}`}>
          <Link href="/admin/users" className="admin-module-trigger" style={{ textDecoration: 'none' }}>
            <span className="admin-module-trigger-main">
              <Users size={14} />
              <span>Tài khoản</span>
            </span>
          </Link>
        </article>

        <article className={`admin-module-item ${pathname?.startsWith("/admin/statistics") ? "is-active" : ""}`} style={{ order: -1 }}>
          <Link href="/admin/statistics" className="admin-module-trigger" style={{ textDecoration: 'none' }}>
            <span className="admin-module-trigger-main">
              <BarChart3 size={14} />
              <span>Thống kê</span>
            </span>
          </Link>
        </article>

        <article className={`admin-module-item ${pathname?.startsWith("/admin/tests") ? "is-active" : ""}`}>
          <button
            type="button"
            className={`admin-module-trigger ${openModule === "tests" ? "is-open" : ""}`}
            onClick={() => setOpenModule((current) => (current === "tests" ? null : "tests"))}
          >
            <span className="admin-module-trigger-main">
              <Timer size={14} />
              <span>Kiểm tra</span>
            </span>
            <ChevronDown size={13} className="admin-module-chevron" />
          </button>

          <div className={`admin-module-collapse ${openModule === "tests" ? "is-open" : ""}`}>
            <div className="admin-level-links">
              {ADMIN_LEVELS.map((level) => {
                const levelHref = `/admin/tests/${level}`;
                const levelActive = isAdminLevelPath(pathname, "tests", level);

                return (
                  <Link key={`tests-${level}`} href={levelHref} className={`admin-level-link ${levelActive ? "is-active" : ""}`}>
                    {level.toUpperCase()}
                  </Link>
                );
              })}
            </div>
          </div>
        </article>

        <div className="admin-side-divider" />

        {ADMIN_MODULES.map((moduleItem) => {
          const Icon = MODULE_ICONS[moduleItem.key] || BookOpen;
          const moduleActive = isAdminModulePath(pathname, moduleItem.key);
          const isOpen = openModule === moduleItem.key;

          return (
            <article key={moduleItem.key} className={`admin-module-item ${moduleActive ? "is-active" : ""}`}>
              <button
                type="button"
                className={`admin-module-trigger ${isOpen ? "is-open" : ""}`}
                onClick={() => setOpenModule((current) => (current === moduleItem.key ? null : moduleItem.key))}
              >
                <span className="admin-module-trigger-main">
                  <Icon size={14} />
                  <span>{moduleItem.label}</span>
                </span>
                <ChevronDown size={13} className="admin-module-chevron" />
              </button>

              <div className={`admin-module-collapse ${isOpen ? "is-open" : ""}`}>
                <div className="admin-level-links">
                  {ADMIN_LEVELS.map((level) => {
                    const levelHref = `/admin/${moduleItem.key}/${level}`;
                    const levelActive = isAdminLevelPath(pathname, moduleItem.key, level);

                    return (
                      <Link key={`${moduleItem.key}-${level}`} href={levelHref} className={`admin-level-link ${levelActive ? "is-active" : ""}`}>
                        {level.toUpperCase()}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </nav>
    </aside>
  );
}
