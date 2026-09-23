/**
 * Booking v1. The user plans their own visit against an open package.
 * Message opens LINE or WhatsApp. Done hands off to Log Session.
 * Nothing on this screen tells the user the clinic has confirmed a chair.
 */
import { useMemo, useState } from "react";
import {
  buildVisit,
  clinicContact,
  draftMessage,
  earlierVisits,
  formatDateLabel,
  formatVisitWhen,
  isAfterExpiry,
  messageUrl,
  packSummary,
  resolveBookingUrl,
  sessionsLeftText,
  splitPlannedAt,
  suggestNextDate,
  upcomingVisits,
  cleanBookingUrl,
} from "./visits";

const STATUS_KEY = {
  planned: "booking_planned",
  canceled: "booking_canceled",
  completed: "booking_done",
};

function statusLabel(status, t) {
  const key = STATUS_KEY[status];
  return key ? t(key) : "";
}

function findPack(list, id) {
  return (list || []).find((pack) => String(pack.id) === String(id)) || null;
}

function blankForm(openPacks, profile) {
  const only = openPacks.length === 1 ? openPacks[0] : null;
  return {
    id: "",
    packageId: only ? String(only.id) : "",
    date: only ? (suggestNextDate(only) || "") : "",
    time: "",
    notes: "",
    remind: true,
    messageAfter: false,
    bookingUrl: only ? (resolveBookingUrl(only, profile) || "") : "",
    dateTouched: false,
    linkTouched: false,
  };
}

function formFromVisit(visit, packs, profile) {
  const split = splitPlannedAt(visit.plannedAt);
  const pack = findPack(packs, visit.packageId);
  return {
    id: visit.id,
    packageId: String(visit.packageId || ""),
    date: split.date,
    time: split.time,
    notes: visit.notes || "",
    remind: Boolean(visit.remindAt),
    messageAfter: false,
    bookingUrl: visit.bookingUrl || resolveBookingUrl(pack, profile) || "",
    dateTouched: true,
    linkTouched: Boolean(visit.bookingUrl),
  };
}

export function BookingScreen({
  t,
  locale = "en",
  openPacks = [],
  treatments = [],
  visits = [],
  visitsReady = true,
  profile = null,
  channel = "none",
  isSaving = false,
  onSaveVisit,
  onCancelVisit,
  onCompleteVisit,
  onSaveContact,
  onAddTreatment,
  onOpenUrl,
  iconFor,
  paletteFor,
  initialSheet = null,
  initialForm = null,
  initialMenuId = null,
  initialNotice = false,
  initialContact = null,
}) {
  const [sheet, setSheet] = useState(initialSheet);
  const [form, setForm] = useState(() => initialForm || blankForm(openPacks, profile));
  const [notice, setNotice] = useState(Boolean(initialNotice));
  const [pendingUrl, setPendingUrl] = useState("");
  const [menuId, setMenuId] = useState(initialMenuId);
  const [confirmId, setConfirmId] = useState(null);
  const [contact, setContact] = useState(initialContact);

  const upcoming = useMemo(() => upcomingVisits(visits), [visits]);
  const earlier = useMemo(() => earlierVisits(visits), [visits]);
  const glyph = iconFor || (() => "✧");
  const palette = paletteFor || (() => ({ bg: "#F5EFE6", accent: "#B4915F" }));

  function openExternal(url) {
    if (!url) return;
    if (onOpenUrl) {
      onOpenUrl(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openPlan() {
    setForm(blankForm(openPacks, profile));
    setMenuId(null);
    setSheet("plan");
  }

  function startEdit(visit) {
    setForm(formFromVisit(visit, treatments.length ? treatments : openPacks, profile));
    setMenuId(null);
    setConfirmId(null);
    setSheet("plan");
  }

  function requestMessage(pack, plannedAt) {
    if (!pack) {
      if (openPacks.length === 1) {
        requestMessage(openPacks[0], "");
        return;
      }
      setSheet("pick");
      return;
    }
    const text = draftMessage({ pack, plannedAt, locale });
    const url = channel === "none" ? null : messageUrl({
      channel,
      contact: clinicContact(pack, profile),
      text,
    });
    if (url) {
      openExternal(url);
      return;
    }
    setContact({ pack, text, lineOaId: "", whatsappPhone: "" });
    setSheet("contact");
  }

  const hasVisits = upcoming.length > 0 || earlier.length > 0;

  return (
    <div data-testid="booking-screen" data-channel={channel} style={{ paddingBottom: 100 }}>
      <div style={{ background: "linear-gradient(160deg,#EDE5D8,#F5EFE6,#FAF7F2)", padding: "calc(60px + env(safe-area-inset-top)) 24px 28px", borderRadius: "0 0 32px 32px", borderBottom: "1px solid rgba(180,145,95,0.12)" }}>
        <p style={{ fontSize: 11, color: "#B4915F", fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>{t("booking_tab")}</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 300, lineHeight: 1.1 }}>{t("booking_title")}</h1>
        <p style={{ fontSize: 13, color: "#9A8A78", marginTop: 10, maxWidth: 300, lineHeight: 1.55 }}>{t("booking_lede")}</p>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {notice && (
          <div role="status" data-testid="visit-success" className="card" style={{ padding: "18px 18px", marginBottom: 14, background: "#FDF9F3" }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 400 }}>{t("booking_success_title")}</p>
            <p style={{ fontSize: 13, color: "#7A6A58", marginTop: 6, lineHeight: 1.55 }}>{t("booking_success_body")}</p>
            {pendingUrl ? (
              <a href={pendingUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, color: "#B4915F", fontSize: 13, fontWeight: 600 }}>
                {t("booking_open_chat")}
              </a>
            ) : null}
            <button type="button" onClick={() => { setNotice(false); setPendingUrl(""); }}
              style={{ display: "block", marginTop: 12, background: "none", border: "none", color: "#9A8A78", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500, padding: 0 }}>
              {t("booking_dismiss")}
            </button>
          </div>
        )}

        {!visitsReady && (
          <div className="card" data-testid="booking-loading" style={{ padding: "28px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#9A8A78" }}>{t("booking_loading")}</p>
          </div>
        )}

        {visitsReady && !hasVisits && openPacks.length === 0 && (
          <EmptyCard
            testId="booking-empty-nopacks"
            title={t("booking_nopack_title")}
            body={t("booking_nopack_body")}
          >
            <button type="button" className="btn btn-c" style={{ marginTop: 18 }} onClick={onAddTreatment}>{t("add_treatment")}</button>
          </EmptyCard>
        )}

        {visitsReady && !hasVisits && openPacks.length > 0 && (
          <EmptyCard
            testId="booking-empty-packs"
            title={t("booking_empty_title")}
            body={t("booking_empty_body")}
          >
            <button type="button" className="btn btn-c" style={{ marginTop: 18 }} onClick={openPlan}>{t("booking_plan")}</button>
            <button type="button" className="btn btn-g" style={{ marginTop: 10 }} onClick={() => requestMessage(null)}>{t("booking_message_clinic")}</button>
          </EmptyCard>
        )}

        {visitsReady && upcoming.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                pack={findPack(treatments, visit.packageId) || findPack(openPacks, visit.packageId)}
                profile={profile}
                t={t}
                locale={locale}
                palette={palette}
                glyph={glyph}
                menuOpen={String(menuId) === String(visit.id)}
                confirming={String(confirmId) === String(visit.id)}
                isSaving={isSaving}
                onToggleMenu={() => setMenuId(String(menuId) === String(visit.id) ? null : visit.id)}
                onEdit={() => startEdit(visit)}
                onAskCancel={() => { setMenuId(null); setConfirmId(visit.id); }}
                onKeep={() => setConfirmId(null)}
                onCancel={() => onCancelVisit && onCancelVisit(visit)}
                onMessage={() => {
                  const pack = findPack(treatments, visit.packageId) || findPack(openPacks, visit.packageId);
                  if (pack) requestMessage(pack, visit.plannedAt);
                  else requestMessage({
                    id: visit.packageId,
                    name: visit.treatmentName,
                    clinic: visit.clinicName,
                    trackMode: "journal",
                  }, visit.plannedAt);
                }}
                onDone={() => onCompleteVisit && onCompleteVisit(visit)}
              />
            ))}
          </div>
        )}

        {visitsReady && hasVisits && openPacks.length > 0 && (
          <button type="button" className="btn btn-c" style={{ marginTop: 16 }} onClick={openPlan}>{t("booking_plan")}</button>
        )}

        {visitsReady && earlier.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#9A8A78", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 }}>{t("booking_earlier")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {earlier.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  pack={findPack(treatments, visit.packageId)}
                  profile={profile}
                  t={t}
                  locale={locale}
                  palette={palette}
                  glyph={glyph}
                  quiet
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {sheet === "plan" && (
        <PlanSheet
          t={t}
          locale={locale}
          form={form}
          setForm={setForm}
          openPacks={openPacks}
          treatments={treatments}
          profile={profile}
          isSaving={isSaving}
          onClose={() => { if (!isSaving) setSheet(null); }}
          onSave={async (event) => {
            event.preventDefault();
            const pack = findPack(openPacks, form.packageId) || findPack(treatments, form.packageId);
            if (!pack || !form.date) return;
            const linkError = form.bookingUrl && !cleanBookingUrl(form.bookingUrl);
            if (linkError) return;
            const existing = form.id ? upcoming.find((visit) => String(visit.id) === String(form.id)) : null;
            const visit = buildVisit({
              id: form.id,
              existing,
              pack,
              date: form.date,
              time: form.time,
              notes: form.notes,
              remind: form.remind,
              bookingUrl: form.bookingUrl,
              channel,
            });
            if (!visit) return;
            const text = draftMessage({ pack, plannedAt: visit.plannedAt, locale });
            const url = form.messageAfter && channel !== "none"
              ? messageUrl({ channel, contact: clinicContact(pack, profile), text })
              : null;
            let preopened = null;
            if (url && !onOpenUrl) {
              preopened = window.open("", "_blank");
              if (preopened) preopened.opener = null;
            }
            const ok = onSaveVisit ? await onSaveVisit(visit) : false;
            if (!ok) {
              if (preopened) preopened.close();
              return;
            }
            setNotice(true);
            if (url) {
              if (preopened) preopened.location.href = url;
              else if (onOpenUrl) onOpenUrl(url);
              setPendingUrl(url);
              setSheet(null);
              return;
            }
            if (preopened) preopened.close();
            if (form.messageAfter) {
              setContact({ pack, text, lineOaId: "", whatsappPhone: "" });
              setSheet("contact");
              return;
            }
            setSheet(null);
          }}
        />
      )}

      {sheet === "contact" && contact && (
        <ContactSheet
          t={t}
          channel={channel}
          contact={contact}
          setContact={setContact}
          isSaving={isSaving}
          onClose={() => { if (!isSaving) setSheet(null); }}
          onSubmit={async (event) => {
            event.preventDefault();
            if (channel === "none") {
              setSheet(null);
              return;
            }
            const lineOaId = String(contact.lineOaId || "").trim();
            const whatsappPhone = String(contact.whatsappPhone || "").trim();
            if (channel === "line" && !lineOaId) return;
            if (channel === "whatsapp" && !whatsappPhone) return;
            const saved = onSaveContact
              ? await onSaveContact(contact.pack.id, {
                lineOaId: channel === "line" ? lineOaId : "",
                whatsappPhone: channel === "whatsapp" ? whatsappPhone : "",
              })
              : false;
            if (!saved) return;
            const url = messageUrl({
              channel,
              contact: { lineOaId, whatsappPhone },
              text: contact.text,
            });
            if (url) openExternal(url);
            setSheet(null);
          }}
        />
      )}

      {sheet === "pick" && (
        <div className="mbg" onClick={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          <div className="msheet" role="dialog" aria-label={t("booking_which_clinic")}>
            <div className="mhandle" />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 400, marginBottom: 6 }}>{t("booking_which_clinic")}</h2>
            <p style={{ fontSize: 13, color: "#9A8A78", marginBottom: 18, lineHeight: 1.5 }}>{t("booking_plan_sub")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {openPacks.map((pack) => {
                const summary = packSummary(pack);
                return (
                  <button key={pack.id} type="button" className="btn btn-g" style={{ textAlign: "left", borderRadius: 16 }}
                    onClick={() => requestMessage(pack, "")}>
                    {summary.treatmentName} · {summary.clinicName}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setSheet(null)}
              style={{ background: "none", border: "none", color: "#9A8A78", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500, padding: "16px 0 0", width: "100%" }}>
              {t("booking_close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyCard({ testId, title, body, children }) {
  return (
    <div className="card" data-testid={testId} style={{ padding: "52px 24px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "#F5EFE6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B4915F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: "#9A8A78", fontStyle: "italic", marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 13, color: "#C4B8A8", lineHeight: 1.55 }}>{body}</p>
      {children}
    </div>
  );
}

function VisitCard({
  visit,
  pack,
  profile,
  t,
  locale,
  palette,
  glyph,
  quiet,
  menuOpen,
  confirming,
  isSaving,
  onToggleMenu,
  onEdit,
  onAskCancel,
  onKeep,
  onCancel,
  onMessage,
  onDone,
}) {
  const summary = packSummary(pack);
  const tone = palette(pack || { palette: 0 });
  const when = formatVisitWhen(visit.plannedAt, locale);
  const left = summary && !summary.journal ? sessionsLeftText(summary.sessionsLeft, locale) : "";
  const page = resolveBookingUrl(pack, profile, visit);
  const label = statusLabel(visit.status, t);

  return (
    <div className="card" data-testid="visit-card" data-status={visit.status} style={{ padding: "18px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: tone.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18, color: tone.accent }}>
            {glyph(visit.treatmentName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <span className="pill pill-c" data-testid="visit-status">{label}</span>
            <p style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{visit.treatmentName}</p>
            <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 2 }}>{[visit.clinicName, when].filter(Boolean).join(" · ")}</p>
            {left ? <p style={{ fontSize: 12, color: "#8C6E40", fontWeight: 600, marginTop: 6 }}>{left}</p> : null}
            {summary && summary.journal ? <p style={{ fontSize: 12, color: "#8C6E40", fontWeight: 600, marginTop: 6 }}>{t("booking_journal")}</p> : null}
            {page ? (
              <a href={page} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "#B4915F", fontWeight: 600 }}>
                {t("booking_open_page")}
              </a>
            ) : null}
          </div>
        </div>
        {!quiet && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button type="button" aria-label={t("booking_menu")} aria-expanded={menuOpen ? "true" : "false"} onClick={onToggleMenu}
              style={{ background: "#F5EFE6", border: "none", borderRadius: 12, width: 36, height: 36, cursor: "pointer", color: "#7A6A58", fontSize: 18, lineHeight: 1 }}>
              ···
            </button>
            {menuOpen && (
              <div role="menu" style={{ position: "absolute", right: 0, top: "110%", background: "#fff", borderRadius: 14, border: "1px solid rgba(180,145,95,0.18)", boxShadow: "0 8px 24px rgba(28,22,18,0.08)", minWidth: 160, zIndex: 3, overflow: "hidden" }}>
                <button type="button" role="menuitem" onClick={onEdit} style={menuItem}>{t("booking_edit")}</button>
                <button type="button" role="menuitem" onClick={onAskCancel} style={menuItem}>{t("booking_cancel_visit")}</button>
              </div>
            )}
          </div>
        )}
      </div>
      {!quiet && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <button type="button" className="btn btn-g" style={{ padding: "10px 14px" }} disabled={isSaving} onClick={onMessage}>{t("booking_message")}</button>
          <button type="button" className="btn btn-g" style={{ padding: "10px 14px" }} disabled={isSaving} onClick={onDone}>{t("booking_mark_done")}</button>
        </div>
      )}
      {confirming && (
        <div data-testid="cancel-confirm" style={{ marginTop: 14, background: "#FDF9F3", borderRadius: 14, padding: "12px 14px" }}>
          <p style={{ fontSize: 13, color: "#7A6A58", lineHeight: 1.5 }}>{t("booking_cancel_confirm")}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-g" style={{ padding: "10px 14px" }} disabled={isSaving} onClick={onCancel}>{t("booking_cancel_visit")}</button>
            <button type="button" className="btn btn-g" style={{ padding: "10px 14px" }} onClick={onKeep}>{t("booking_keep")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const menuItem = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  padding: "12px 14px",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 500,
  color: "#1C1612",
  cursor: "pointer",
};

function PlanSheet({
  t,
  locale,
  form,
  setForm,
  openPacks,
  treatments,
  profile,
  isSaving,
  onClose,
  onSave,
}) {
  const pickerPacks = openPacks.slice();
  if (form.packageId && !pickerPacks.some((pack) => String(pack.id) === String(form.packageId))) {
    const extra = findPack(treatments, form.packageId);
    if (extra) pickerPacks.unshift(extra);
  }
  const selected = findPack(pickerPacks, form.packageId);
  const summary = packSummary(selected);
  const suggested = selected ? suggestNextDate(selected) : null;
  const linkError = Boolean(form.bookingUrl && !cleanBookingUrl(form.bookingUrl));
  const expiryWarn = Boolean(
    summary && !summary.journal && summary.expiryDate && isAfterExpiry(form.date, summary.expiryDate)
  );
  const canSave = Boolean(selected && form.date) && !linkError && !isSaving;

  function selectPack(id) {
    const pack = findPack(pickerPacks, id);
    setForm((prev) => {
      const next = { ...prev, packageId: id };
      if (!prev.dateTouched) next.date = (pack && suggestNextDate(pack)) || "";
      if (!prev.linkTouched) next.bookingUrl = (pack && resolveBookingUrl(pack, profile)) || "";
      return next;
    });
  }

  return (
    <div className="mbg" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="msheet" data-testid="plan-visit" onSubmit={onSave}>
        <div className="mhandle" />
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 400 }}>
          {form.id ? t("booking_edit_title") : t("booking_plan")}
        </h2>
        <p style={{ fontSize: 13, color: "#9A8A78", marginTop: 4, marginBottom: 20, lineHeight: 1.5 }}>{t("booking_plan_sub")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span className="lbl">{t("booking_package")}</span>
            <select className="inp" aria-label={t("booking_package")} value={form.packageId} onChange={(event) => selectPack(event.target.value)}>
              <option value="">{t("booking_choose_pack")}</option>
              {pickerPacks.map((pack) => {
                const item = packSummary(pack);
                const left = item.journal ? t("booking_journal") : sessionsLeftText(item.sessionsLeft, locale);
                const exp = item.expiryDate ? `${t("booking_expires")} ${formatDateLabel(item.expiryDate, locale)}` : "";
                const label = [item.treatmentName, item.clinicName, left, exp].filter(Boolean).join(" · ");
                return <option key={pack.id} value={String(pack.id)}>{label}</option>;
              })}
            </select>
          </div>

          {summary && (
            <div className="card" data-testid="pack-summary" style={{ padding: "14px 16px" }}>
              <span className="lbl">{t("booking_read_only")}</span>
              <p style={{ fontSize: 15, fontWeight: 600 }}>{summary.treatmentName}</p>
              <p style={{ fontSize: 13, color: "#9A8A78", marginTop: 2 }}>{summary.clinicName}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {summary.kind ? <span className={`pill ${summary.kind === "promo" ? "pill-promo" : "pill-paid"}`}>{t(summary.kind)}</span> : null}
                {summary.journal ? <span className="pill pill-journal">{t("booking_journal")}</span> : (
                  <span className="pill pill-c">{sessionsLeftText(summary.sessionsLeft, locale)}</span>
                )}
              </div>
              {!summary.journal && (
                <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 8 }}>
                  {t("booking_sessions_left")}: {summary.sessionsLeft}
                  {summary.expiryDate ? ` · ${t("booking_expires")} ${formatDateLabel(summary.expiryDate, locale)}` : ""}
                </p>
              )}
            </div>
          )}

          <div>
            <span className="lbl">{t("booking_date")}</span>
            <input className="inp" type="date" required value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value, dateTouched: true }))} />
            {suggested && form.date === suggested ? (
              <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 6, lineHeight: 1.45 }}>{t("booking_suggest_hint")}</p>
            ) : null}
            {expiryWarn ? (
              <p data-testid="expiry-warn" style={{ fontSize: 12, color: "#C89040", marginTop: 6, lineHeight: 1.45 }}>{t("booking_expiry_warn")}</p>
            ) : null}
          </div>

          <div>
            <span className="lbl">{t("booking_time")}</span>
            <input className="inp" type="time" value={form.time}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))} />
            <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 6 }}>{t("booking_time_hint")}</p>
          </div>

          <div>
            <span className="lbl">{t("booking_notes")}</span>
            <textarea className="inp" rows={3} placeholder={t("booking_notes_ph")} value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <input type="checkbox" checked={form.remind} onChange={(event) => setForm((prev) => ({ ...prev, remind: event.target.checked }))} />
            {t("booking_remind")}
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <input type="checkbox" checked={form.messageAfter} onChange={(event) => setForm((prev) => ({ ...prev, messageAfter: event.target.checked }))} />
            {t("booking_message_after")}
          </label>

          <div>
            <span className="lbl">{t("booking_link")}</span>
            <input className={`inp${linkError ? " invalid" : ""}`} type="url" inputMode="url" placeholder="https://" value={form.bookingUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, bookingUrl: event.target.value, linkTouched: true }))} />
            <p style={{ fontSize: 12, color: linkError ? "#C05858" : "#9A8A78", marginTop: 6, lineHeight: 1.45 }}>
              {linkError ? t("booking_link_invalid") : t("booking_link_hint")}
            </p>
          </div>

          <button type="submit" className="btn btn-c" data-testid="save-visit" disabled={!canSave}>
            {isSaving ? t("booking_saving") : t("booking_save")}
          </button>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", color: "#9A8A78", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500, padding: "4px 0" }}>
            {t("booking_close")}
          </button>
        </div>
      </form>
    </div>
  );
}

function ContactSheet({ t, channel, contact, setContact, isSaving, onClose, onSubmit }) {
  const lineReady = channel !== "line" || Boolean(String(contact.lineOaId || "").trim());
  const waReady = channel !== "whatsapp" || Boolean(String(contact.whatsappPhone || "").trim());
  return (
    <div className="mbg" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="msheet" data-testid="contact-sheet" onSubmit={onSubmit}>
        <div className="mhandle" />
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 400 }}>{t("booking_contact_title")}</h2>
        <p style={{ fontSize: 13, color: "#9A8A78", marginTop: 6, marginBottom: 18, lineHeight: 1.55 }}>
          {channel === "none" ? t("booking_no_channel") : t("booking_contact_body")}
        </p>
        {channel === "line" && (
          <div>
            <span className="lbl">{t("booking_line_label")}</span>
            <input className="inp" autoComplete="off" placeholder={t("booking_line_ph")} value={contact.lineOaId || ""}
              onChange={(event) => setContact((prev) => ({ ...prev, lineOaId: event.target.value }))} />
          </div>
        )}
        {channel === "whatsapp" && (
          <div>
            <span className="lbl">{t("booking_wa_label")}</span>
            <input className="inp" type="tel" autoComplete="off" placeholder={t("booking_wa_ph")} value={contact.whatsappPhone || ""}
              onChange={(event) => setContact((prev) => ({ ...prev, whatsappPhone: event.target.value }))} />
          </div>
        )}
        {channel !== "none" && (
          <button type="submit" className="btn btn-c" style={{ marginTop: 16 }} disabled={isSaving || !lineReady || !waReady}>
            {t("booking_open_chat")}
          </button>
        )}
        <button type="button" onClick={onClose}
          style={{ background: "none", border: "none", color: "#9A8A78", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500, padding: "14px 0 0", width: "100%" }}>
          {t("booking_close")}
        </button>
      </form>
    </div>
  );
}
