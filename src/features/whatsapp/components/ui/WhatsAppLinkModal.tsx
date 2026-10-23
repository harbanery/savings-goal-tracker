"use client";

import {
  CheckCircleOutlined,
  DisconnectOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Descriptions,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { WHATSAPP_PAIRING_TTL_MINUTES } from "@/utils/config/variables";
import type { Locale } from "@/types/locale";

/**
 * Modal integrasi WhatsApp (menu user > WhatsApp): status bot, nomor
 * terhubung, dan pembuatan kode pairing. Bot hidup di service BE TERPISAH
 * (repo savings-goal-tracker-be: Express + Baileys) — FE hanya membaca
 * statusnya via /api/web/whatsapp/status dan membuat kode pairing.
 */

interface WhatsAppStatus {
  bot: {
    status: "connected" | "connecting" | "disconnected" | "not-configured";
    phone: string | null;
  };
  link: { jid: string; linkedAt: string } | null;
}

/** "62812…@s.whatsapp.net" → "+62812…" (tampilan ramah). */
function formatJid(jid: string): string {
  return `+${jid.replace(/@s\.whatsapp\.net$/, "")}`;
}

function formatLinkedDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function WhatsAppLinkModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [pairingCode, setPairingCode] = useState<{
    code: string;
    expiresAt: Date;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/web/whatsapp/status", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setStatus((await res.json()) as WhatsAppStatus);
    } catch {
      void message.error(t("whatsapp.loadFailed"));
    }
  }, [message, t]);

  // Pola callback (ala NotificationBell): setState hanya di callback asinkron,
  // bukan dipanggil sinkron dari body effect.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/web/whatsapp/status", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as WhatsAppStatus;
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) void message.error(t("whatsapp.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [open, message, t]);

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/web/whatsapp/link-code", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string; expiresAt: string };
      setPairingCode({ code: data.code, expiresAt: new Date(data.expiresAt) });
      void message.success(t("whatsapp.codeSuccess"));
    } catch {
      void message.error(t("whatsapp.actionFailed"));
    } finally {
      setGenerating(false);
    }
  }

  async function unlink() {
    setUnlinking(true);
    try {
      const res = await fetch("/api/web/whatsapp/link", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setPairingCode(null);
      await loadStatus();
    } catch {
      void message.error(t("whatsapp.actionFailed"));
    } finally {
      setUnlinking(false);
    }
  }

  const botActive = status?.bot.status === "connected";
  // TTL kode pairing diketahui statis dari config — dipakai langsung agar
  // render murni (tanpa Date.now() yang membuat render tidak idempoten).
  const minutesLeft = pairingCode ? WHATSAPP_PAIRING_TTL_MINUTES : 0;

  return (
    <Modal
      title={
        <Space size={8}>
          <WhatsAppOutlined style={{ color: "#25d366" }} />
          <span>{t("whatsapp.title")}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" className="mb-4!">
        {t("whatsapp.desc")}
      </Typography.Paragraph>

      <Descriptions
        size="small"
        column={1}
        bordered
        items={[
          {
            key: "bot",
            label: t("whatsapp.botStatus"),
            children: (
              <Space size={8} wrap>
                <Tag
                  color={
                    status?.bot.status === "not-configured"
                      ? "default"
                      : botActive
                        ? "success"
                        : "warning"
                  }
                  icon={botActive ? <CheckCircleOutlined /> : undefined}
                >
                  {status?.bot.status === "not-configured"
                    ? t("whatsapp.botNotConfigured")
                    : botActive
                      ? t("whatsapp.botActive")
                      : t("whatsapp.botInactive")}
                </Tag>
                {status?.bot.phone && (
                  <Typography.Text type="secondary">
                    {t("whatsapp.botNumber")}: {formatJid(status.bot.phone)}
                  </Typography.Text>
                )}
              </Space>
            ),
          },
          {
            key: "link",
            label: t("whatsapp.linkedNumber"),
            children: status?.link ? (
              <Space size={12} wrap>
                <Typography.Text strong>{formatJid(status.link.jid)}</Typography.Text>
                <Popconfirm
                  title={t("whatsapp.unlinkConfirm")}
                  okText={t("whatsapp.unlink")}
                  cancelText={t("common.cancel")}
                  okButtonProps={{ danger: true, loading: unlinking }}
                  onConfirm={() => void unlink()}
                >
                  <Button danger size="small" icon={<DisconnectOutlined />}>
                    {t("whatsapp.unlink")}
                  </Button>
                </Popconfirm>
              </Space>
            ) : (
              <Typography.Text type="secondary">
                {t("whatsapp.notLinked")}
              </Typography.Text>
            ),
          },
        ]}
      />

      {status?.link ? (
        <Typography.Paragraph type="secondary" className="mt-3! mb-0!">
          {t("whatsapp.linkedAt", {
            date: formatLinkedDate(status.link.linkedAt, locale),
          })}
        </Typography.Paragraph>
      ) : (
        <div className="mt-4">
          {!pairingCode ? (
            <Button
              type="primary"
              icon={<WhatsAppOutlined />}
              loading={generating}
              onClick={() => void generateCode()}
            >
              {t("whatsapp.getCode")}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Typography.Text type="secondary">
                {t("whatsapp.codeLabel")}
              </Typography.Text>
              <Typography.Title level={2} copyable className="m-0! tracking-[0.4em]!">
                {pairingCode.code}
              </Typography.Title>
              <Typography.Text type="secondary">
                {t("whatsapp.codeExpires", { minutes: minutesLeft })}
              </Typography.Text>
              <Typography.Text strong className="mt-2!">
                {t("whatsapp.stepTitle")}
              </Typography.Text>
              <ol className="list-decimal pl-5">
                <li>{t("whatsapp.step1")}</li>
                <li>
                  <Typography.Text code copyable>
                    {t("whatsapp.step2", { code: pairingCode.code })}
                  </Typography.Text>
                </li>
                <li>{t("whatsapp.step3")}</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
