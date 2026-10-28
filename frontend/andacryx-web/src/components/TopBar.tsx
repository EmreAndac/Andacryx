import {
  Bell,
  ChevronDown,
  Hexagon,
  Moon,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";

import { APP_CONFIG } from "../config/app.config";

export default function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <Hexagon size={27} strokeWidth={2.8} />
        <strong>{APP_CONFIG.name}</strong>
        <span className="beta-tag">{APP_CONFIG.release}</span>
      </div>

      <div className="topbar-actions">
        <div className="topbar-search">
          <Search size={16} />
          <span>Dosya, sınıf veya metot ara...</span>
          <kbd>Ctrl + K</kbd>
        </div>

        <Moon size={18} />
        <Bell size={18} />
        <Settings2 size={18} />

        <div className="topbar-profile">
          <UserRound size={19} />
          <span>Misafir</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </div>
  );
}
