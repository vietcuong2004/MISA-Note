import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  Bell,
  HelpCircle,
  MoreVertical,
  ExternalLink,
  BookOpen,
  MessageCircle,
  PhoneCall,
  Key,
  UserCheck,
  Shield,
  Globe,
  LogOut,
  Building2,
  Copy,
  Check,
  QrCode,
  Smartphone,
  ChevronDown,
  Layers,
  FileText,
  Calendar,
  CheckSquare,
  Users,
  Palette,
} from 'lucide-react';
import { CURRENT_USER } from '../../data/mockData';
import { ThemeId } from '../../app/theme/themes';
import { ThemePicker } from './ThemePicker';

interface HeaderProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onOpenSearch: () => void;
  onOpenChat: () => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeChange,
  onOpenSearch,
  onOpenChat,
  onNavigateHome
}) => {
  const [activeDropdown, setActiveDropdown] = useState<'help' | 'more' | 'account' | 'launcher' | 'notification' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notificationCount] = useState(0);
  const [showAppearance, setShowAppearance] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setActiveDropdown(null); setShowAppearance(false); }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleCopyInstallLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText('https://onelink.to/ezkz3e');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      ref={headerRef}
      className="main-header h-12 bg-[#1F59B6] text-white px-4 flex items-center justify-between shrink-0 z-40 select-none shadow-xs border-b border-[#1A4EA3] relative"
    >
      {/* 1. Logo & App Launcher */}
      <div id="logo" className="left flex items-center gap-3">
        {/* AMIS App Launcher (9 dots icon) */}
        <div className="relative">
          <div
            id="AMIS_Launcher"
            className="box-app-menu w-8 h-8 rounded-md flex items-center justify-center hover:bg-[var(--ui-surface)]/15 cursor-pointer transition-colors"
            title="Danh sách ứng dụng AMIS"
            onClick={() => setActiveDropdown(activeDropdown === 'launcher' ? null : 'launcher')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" className="text-white">
              <circle cx="3" cy="3" r="1.75" />
              <circle cx="9" cy="3" r="1.75" />
              <circle cx="15" cy="3" r="1.75" />
              <circle cx="3" cy="9" r="1.75" />
              <circle cx="9" cy="9" r="1.75" />
              <circle cx="15" cy="9" r="1.75" />
              <circle cx="3" cy="15" r="1.75" />
              <circle cx="9" cy="15" r="1.75" />
              <circle cx="15" cy="15" r="1.75" />
            </svg>
          </div>

          {/* Launcher Popover */}
          {activeDropdown === 'launcher' && (
            <div className="absolute top-10 left-0 w-72 bg-[var(--ui-surface)] rounded-xl shadow-2xl border border-gray-200 text-[var(--ui-text)] p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 tracking-wider">
                Ứng dụng MISA AMIS
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-blue-50 cursor-pointer text-center group"
                  onClick={() => {
                    setActiveDropdown(null);
                    onNavigateHome?.();
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1F59B6] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium mt-1.5 text-gray-800 line-clamp-1">Ghi chép</span>
                </div>

                <a
                  href="https://amis.misa.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00A859] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium mt-1.5 text-gray-800 line-clamp-1">Công việc</span>
                </a>

                <a
                  href="https://amis.misa.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium mt-1.5 text-gray-800 line-clamp-1">Quy trình</span>
                </a>

                <a
                  href="https://amis.misa.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium mt-1.5 text-gray-800 line-clamp-1">Mạng XH</span>
                </a>

                <a
                  href="https://amis.misa.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EC4899] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium mt-1.5 text-gray-800 line-clamp-1">Nhân sự</span>
                </a>

                <a
                  href="https://amis.misa.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium mt-1.5 text-gray-800 line-clamp-1">Nền tảng</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Logo Link & Title */}
        <a
          href="/Notes/"
          className="logo-link flex items-center gap-2 group decoration-transparent"
          id="logo-document"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome?.();
          }}
        >
          <div className="main-logo w-7 h-7 rounded-lg bg-[var(--ui-surface)]/20 border border-white/25 flex items-center justify-center text-white shadow-2xs group-hover:bg-[var(--ui-surface)]/25 transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="title-logo font-bold text-[15px] tracking-wide text-white uppercase font-sans">
            GHI CHÉP
          </div>
        </a>
      </div>

      {/* 2. Search Box */}
      <div className="box-search flex-1 max-w-md mx-6" id="main-header-search">
        <div className="relative flex items-center">
          <input
            type="text"
            id="top-search"
            className="form-control w-full h-8 pl-3.5 pr-8 rounded-md bg-[var(--ui-surface)]/15 hover:bg-[var(--ui-surface)]/20 focus:bg-[var(--ui-surface)] focus:text-gray-900 focus:placeholder-gray-400 placeholder-white/75 text-xs text-white border border-white/20 focus:border-white focus:outline-none transition-all shadow-inner cursor-pointer"
            name="textSearch"
            placeholder="Nhập từ khóa tìm kiếm ..."
            onClick={onOpenSearch}
            readOnly
          />
          <span
            className="m-icon icon-top-search absolute right-2.5 text-white/80 pointer-events-none"
          >
            <Search className="w-3.5 h-3.5 stroke-[2]" />
          </span>
        </div>
      </div>

      {/* 3. Sub Header Title (Hidden by default) */}
      <div id="sub-header-title" className="hide hidden">
        <div className="m-icon icon-home" style={{ height: '24px', width: '44px', cursor: 'pointer' }}></div>
        <div
          id="title-home"
          style={{
            paddingLeft: '16px',
            fontWeight: 600,
            fontSize: '16px',
            color: '#ffffff',
            borderLeft: '2px solid',
          }}
        ></div>
      </div>

      {/* 4. Right: User Control Panel */}
      <div className="notes-user-block">
        <div className="user-info">
          <div id="AMIS_UserControlPanel" style={{ display: 'flex' }} className="apui-user-controlpanel items-center gap-1.5">
            {/* Mobile ads (hidden) */}
            <div
              className="apui-user-controlpanel-item"
              id="AMIS_MobileAds"
              style={{ display: 'none' }}
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-mobileads',
                mode: 'light',
                type: 'MobileAds',
              } as any)}
            >
              <div className="apui-user-controlpanel-item-badge">New</div>
            </div>

            {/* Invite box (hidden) */}
            <div
              className="apui-user-controlpanel-item"
              id="AMIS_InviteBox"
              style={{ display: 'none' }}
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-invitebox',
                mode: 'light',
                type: 'InviteBox',
              } as any)}
            ></div>

            {/* Tin nhắn (MessageBox) */}
            <div
              className="apui-user-controlpanel-item misa-messbox-message-trigger misa-messbox-icon-message-light apui-tooltip-trigger relative group"
              id="AMIS_MessageBox"
              data-ucp-tooltip-init="1"
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-messagebox',
                mode: 'light',
                type: 'MessageBox',
                'res-title': 'MessageBoxTooltip',
              } as any)}
            >
              <button
                type="button"
                onClick={onOpenChat}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-[var(--ui-surface)]/15 transition-colors cursor-pointer"
                title="Tin nhắn"
              >
                <MessageSquare className="w-4.5 h-4.5 stroke-[1.8]" />
              </button>
              <div className="misa-messbox-messagebox-root" translate="no"></div>
              <span className="misa-messbox-message-badge"></span>
              {/* Tooltip */}
              <div className="apui-tooltip-body bottom absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-gray-900/90 text-white text-[11px] rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Tin nhắn
              </div>
            </div>

            {/* Thông báo (NotificationBox) */}
            <div
              className="apui-user-controlpanel-item mnoti-selector-box apui-tooltip-trigger relative group"
              id="AMIS_Notification"
              style={{ position: 'relative' }}
              data-ucp-tooltip-init="1"
              data-ucp-drag-init="1"
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-notificationbox',
                mode: 'light',
                type: 'NotificationBox',
              } as any)}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'notification' ? null : 'notification')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-[var(--ui-surface)]/15 transition-colors cursor-pointer relative"
                title="Thông báo"
              >
                <Bell className="w-4.5 h-4.5 stroke-[1.8]" />
                {notificationCount > 0 && (
                  <span className="mnoti-total-number absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {notificationCount}
                  </span>
                )}
              </button>
              {/* Tooltip */}
              <div className="apui-tooltip-body bottom absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-gray-900/90 text-white text-[11px] rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Thông báo
              </div>

              {/* Notification Popover */}
              {activeDropdown === 'notification' && (
                <div className="absolute top-10 right-0 w-80 bg-[var(--ui-surface)] rounded-xl shadow-2xl border border-gray-200 text-[var(--ui-text)] p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="font-semibold text-sm text-gray-800">Thông báo</span>
                    <span className="text-xs text-[var(--ui-brand)] cursor-pointer hover:underline">Đánh dấu đã đọc</span>
                  </div>
                  <div className="py-8 text-center text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="text-xs">Hiện không có thông báo mới nào</p>
                  </div>
                </div>
              )}
            </div>

            {/* Trợ giúp (HelpMenu) */}
            <div
              className="apui-user-controlpanel-item misa-helpmenu-trigger apui-tooltip-trigger relative group"
              id="MISA_ButtonHelp"
              style={{ position: 'relative' }}
              data-ucp-tooltip-init="1"
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-helpmenu',
                mode: 'light',
                type: 'HelpMenu',
              } as any)}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'help' ? null : 'help')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-[var(--ui-surface)]/15 transition-colors cursor-pointer"
                title="Trợ giúp"
              >
                <HelpCircle className="w-4.5 h-4.5 stroke-[1.8]" />
              </button>
              {/* Tooltip */}
              <div className="apui-tooltip-body bottom absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-gray-900/90 text-white text-[11px] rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Trợ giúp
              </div>

              {/* Help Dropdown Menu */}
              {activeDropdown === 'help' && (
                <div className="misa-helpmenu-wrap absolute top-10 right-0 w-64 bg-[var(--ui-surface)] rounded-xl shadow-2xl border border-gray-200 text-[var(--ui-text)] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="misa-helpmenu-container">
                    {/* Group 1 */}
                    <div className="misa-helpmenu-group px-3 py-1">
                      <div className="misa-helpmenu-group-title text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Trợ giúp
                      </div>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://helpamis.misa.vn/ac/amis-ghi-chep/"
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--ui-brand)] transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-[var(--ui-brand)] shrink-0" />
                        <span>Hướng dẫn sử dụng (F1)</span>
                      </a>
                    </div>

                    <div className="h-px bg-gray-100 my-1 mx-3" />

                    {/* Group 2 */}
                    <div className="misa-helpmenu-group px-3 py-1">
                      <div className="misa-helpmenu-group-title text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Kênh hỗ trợ
                      </div>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://forum.misa.vn/"
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--ui-brand)] transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Diễn đàn MISA</span>
                      </a>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://www.misa.vn/tong-dai/"
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--ui-brand)] transition-colors"
                      >
                        <PhoneCall className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Tổng đài hỗ trợ</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Khác (MoreMenu) */}
            <div
              className="apui-user-controlpanel-item misa-moremenu-trigger apui-tooltip-trigger relative group"
              id="MISA_MoreMenu"
              style={{ position: 'relative' }}
              data-ucp-tooltip-init="1"
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-moremenu',
                mode: 'light',
                type: 'MoreMenu',
              } as any)}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-[var(--ui-surface)]/15 transition-colors cursor-pointer"
                title="Khác"
              >
                <MoreVertical className="w-4.5 h-4.5 stroke-[1.8]" />
              </button>
              {/* Tooltip */}
              <div className="apui-tooltip-body bottom absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-gray-900/90 text-white text-[11px] rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Khác
              </div>

              {/* More Dropdown Menu */}
              {activeDropdown === 'more' && (
                <div className="misa-moremenu-wrap absolute top-10 right-0 w-72 bg-[var(--ui-surface)] rounded-xl shadow-2xl border border-gray-200 text-[var(--ui-text)] p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="misa-moremenu-container">
                    {/* Item: Kết nối ứng dụng */}
                    <div
                      className="misa-moremenu-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-[var(--ui-brand)] transition-colors cursor-pointer"
                      {...({ type: 'MISAConnector' } as any)}
                    >
                      <Layers className="w-4 h-4 text-[var(--ui-brand)] shrink-0" />
                      <div className="misa-moremenu-item-content">Kết nối ứng dụng</div>
                    </div>

                    <div className="h-px bg-gray-100 my-2" />

                    {/* Section: Cài đặt AMIS Mobile */}
                    <div className="misa-moremenu-mobile p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                      <div className="misa-moremenu-title font-semibold text-xs text-gray-800">
                        Cài đặt AMIS Mobile
                      </div>
                      <div className="misa-moremenu-des text-[11px] text-gray-500 mt-0.5 leading-snug">
                        Để quản lý công việc mọi lúc, mọi nơi trên điện thoại
                      </div>

                      <div className="misa-moremenu-apps flex items-center gap-3 mt-3">
                        <a
                          className="misa-moremenu-qrcode-wrap block shrink-0 p-1 bg-[var(--ui-surface)] rounded-lg border border-gray-200 shadow-2xs hover:scale-105 transition-transform"
                          target="_blank"
                          rel="noreferrer"
                          href="https://onelink.to/ezkz3e"
                          title="Quét mã QR để cài đặt"
                        >
                          <img
                            className="misa-moremenu-qrcode w-16 h-16 object-contain"
                            src="https://common.misacdn.net/static/images/qr/AMISMobile.png"
                            alt="Mã QR tải AMIS Mobile"
                          />
                        </a>

                        <div className="flex-1 flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyInstallLink}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--ui-surface)] border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-2xs"
                            title="Sao chép liên kết cài đặt"
                          >
                            {copiedLink ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-emerald-700 font-medium">Đã chép!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                <span>Chép liên kết</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <a
                              target="_blank"
                              rel="noreferrer"
                              href="https://apps.apple.com/vn/app/misa-amis/id1521979495"
                              className="text-[10px] text-gray-500 hover:text-[var(--ui-brand)] underline"
                            >
                              App Store
                            </a>
                            <span className="text-gray-300">•</span>
                            <a
                              target="_blank"
                              rel="noreferrer"
                              href="https://play.google.com/store/apps/details?id=vn.com.misa.amis&hl=vi"
                              className="text-[10px] text-gray-500 hover:text-[var(--ui-brand)] underline"
                            >
                              Google Play
                            </a>
                          </div>
                        </div>
                      </div>

                      {copiedLink && (
                        <div className="misa-moremenu-clipboard-notice text-[11px] text-emerald-600 font-medium mt-1.5 text-center">
                          Sao chép thành công
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tài khoản người dùng (MenuAccount) */}
            <div
              className="apui-user-controlpanel-item relative"
              id="User_Menu_Account"
              style={{
                marginLeft: '4px',
                position: 'relative',
                minWidth: '32px',
                minHeight: '32px',
              }}
              {...({
                'item-type': 'init',
                'agent-auto': 'usercontrolpanel-menuaccount',
                mode: 'light',
                type: 'MenuAccount',
              } as any)}
            >
              <button
                type="button"
                className="misa-menuaccount-avatar-trigger w-8 h-8 rounded-full overflow-hidden border border-white/40 hover:border-white shadow-xs cursor-pointer transition-colors"
                onClick={() => setActiveDropdown(activeDropdown === 'account' ? null : 'account')}
                title="Tài khoản cá nhân"
                aria-label="Tài khoản cá nhân"
                aria-expanded={activeDropdown === 'account'}
                aria-controls="account-dropdown"
              >
                <img
                  src={CURRENT_USER.avatar}
                  alt={CURRENT_USER.name}
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Account Dropdown Menu */}
              {activeDropdown === 'account' && (
                <div id="account-dropdown" className="misa-menuaccount-menu absolute top-10 right-0 w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--ui-surface)] rounded-xl shadow-2xl border border-gray-200 text-[var(--ui-text)] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <ul className="misa-menuaccount-popup-menu list-none m-0 p-0">
                    {/* User Profile Summary */}
                    <li className="misa-menuaccount-user-details px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 shrink-0 shadow-2xs">
                        <img
                          className="misa-menuaccount-avatar-img w-full h-full object-cover"
                          src={CURRENT_USER.avatar}
                          alt={CURRENT_USER.name}
                        />
                      </div>
                      <div className="misa-menuaccount-user-info min-w-0">
                        <div className="misa-menuaccount-user-fullname font-semibold text-sm text-gray-900 truncate">
                          {CURRENT_USER.name}
                        </div>
                        <div className="misa-menuaccount-user-account text-xs text-gray-500 truncate" title={CURRENT_USER.email}>
                          {CURRENT_USER.email}
                        </div>
                      </div>
                    </li>

                    {/* Workspace (Company) */}
                    <li className="misa-menuaccount-workspaces px-4 py-2 bg-blue-50/60 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-xs font-medium text-[var(--ui-brand)]">
                        <Building2 className="w-4 h-4 shrink-0 text-[var(--ui-brand)]" />
                        <span className="truncate" title="Công ty cổ phần MISA">
                          Công ty cổ phần MISA
                        </span>
                      </div>
                    </li>

                    {/* Menu Actions */}
                    <li className="py-1">
                      <div
                        className="misa-menuaccount-menu-item flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <Key className="w-4 h-4 text-gray-500" />
                        <label className="cursor-pointer">Đổi mật khẩu</label>
                      </div>

                      <div
                        className="misa-menuaccount-menu-item flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <UserCheck className="w-4 h-4 text-gray-500" />
                        <label className="cursor-pointer">Thiết lập tài khoản</label>
                      </div>

                      <div
                        className="misa-menuaccount-menu-item flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <Shield className="w-4 h-4 text-gray-500" />
                        <label className="cursor-pointer">Thiết lập bảo mật</label>
                      </div>

                      <div className="h-px bg-gray-100 my-1 mx-3" />

                      <button type="button" onClick={() => setShowAppearance(value => !value)}
                        aria-expanded={showAppearance} aria-controls="appearance-options"
                        className="w-full flex items-center justify-between gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors">
                        <span className="flex items-center gap-3"><Palette className="w-4 h-4 text-gray-500" /><span>Giao diện</span></span>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showAppearance ? 'rotate-180' : ''}`} />
                      </button>
                      {showAppearance && <ThemePicker theme={theme} onChange={onThemeChange} />}

                      {/* Language Switcher */}
                      <div className="misa-menuaccount-menu-item flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <span>Ngôn ngữ: Việt Nam</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </div>

                      <div className="h-px bg-gray-100 my-1 mx-3" />

                      {/* Logout */}
                      <div
                        className="misa-menuaccount-logout-item flex items-center gap-3 px-4 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer transition-colors font-medium"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <label className="cursor-pointer">Đăng xuất</label>
                      </div>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
