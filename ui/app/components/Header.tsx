import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";
import { Modal } from "@dynatrace/strato-components/overlays";
import { Button } from "@dynatrace/strato-components/buttons";
import { SettingIcon, HelpIcon } from "@dynatrace/strato-icons";
import { useCustomerName } from "../CustomerNameContext";

const TABS: { to: string; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/assess/dynatrace", label: "DT Maturity" },
  { to: "/assess/personal", label: "Personal Growth" },
  { to: "/results", label: "Results" },
  { to: "/history/dt", label: "DT History" },
  { to: "/history/personal", label: "PG History" },
  { to: "/insights/dt", label: "DT Insights" },
  { to: "/insights/personal", label: "PG Insights" },
  { to: "/executive/dt", label: "DT Executive" },
  { to: "/executive/personal", label: "PG Executive" },
  { to: "/coverage", label: "Coverage Gaps" },
  { to: "/risk", label: "Risk Assessment" },
  { to: "/roi", label: "ROI" },
  { to: "/whatif", label: "What If" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/health", label: "Health" },
  { to: "/platform", label: "Platform Usage" },
  { to: "/qbr", label: "QBR" },
];

export const Header = () => {
  const navigate = useNavigate();
  const { customerName, setCustomerName } = useCustomerName();
  const [showSettings, setShowSettings] = useState(false);
  const [tempName, setTempName] = useState(customerName);

  const openSettings = () => {
    setTempName(customerName);
    setShowSettings(true);
  };

  const saveSettings = () => {
    setCustomerName(tempName.trim());
    setShowSettings(false);
  };

  return (
    <>
      <AppHeader>
        <AppHeader.NavItems>
          <AppHeader.AppNavLink as={Link} to="/" />
        </AppHeader.NavItems>
        <AppHeader.ActionItems>
          <AppHeader.ActionButton
            prefixIcon={<SettingIcon />}
            onClick={openSettings}
          >
            Settings
          </AppHeader.ActionButton>
          <AppHeader.ActionButton
            prefixIcon={<HelpIcon />}
            onClick={() => navigate("/help")}
          >
            Help
          </AppHeader.ActionButton>
        </AppHeader.ActionItems>
      </AppHeader>

      <Modal
        title="Settings"
        show={showSettings}
        onDismiss={() => setShowSettings(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>Customer Name</label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter customer or company name"
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                fontSize: 14,
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") saveSettings(); }}
              autoFocus
            />
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              This name will appear at the top of every page
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="emphasized" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button variant="emphasized" onClick={saveSettings}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const TabBar = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  // Scroll active tab into view when route changes
  useEffect(() => {
    const el = scrollRef.current?.querySelector(".app-tab-link.active") as HTMLElement | null;
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [location.pathname]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="app-tab-bar-wrap" style={{ position: "sticky", top: 0 }}>
      <button
        className={"app-tab-scroll-btn left" + (showLeft ? "" : " hidden")}
        onClick={() => scrollBy(-240)}
        aria-label="Scroll tabs left"
      >
        ›
      </button>
      <div className="app-tab-bar" ref={scrollRef}>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            className={({ isActive }) => "app-tab-link" + (isActive ? " active" : "")}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <button
        className={"app-tab-scroll-btn right" + (showRight ? "" : " hidden")}
        onClick={() => scrollBy(240)}
        aria-label="Scroll tabs right"
      >
        ›
      </button>
    </div>
  );
};
