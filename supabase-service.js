"use strict";

(function createRadarSupabaseService(global) {
  let client = null;
  let currentUser = null;
  let reportsChannel = null;

  function getConfig() {
    return global.RADAR_SUPABASE_CONFIG || {};
  }

  function isConfigured() {
    const config = getConfig();

    return Boolean(
      config.enabled &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(config.url || "")) &&
      String(config.publishableKey || "").startsWith("sb_publishable_") &&
      !String(config.publishableKey).includes("REEMPLAZAR")
    );
  }

  function isConnected() {
    return Boolean(client && currentUser?.id);
  }

  async function initialize() {
    if (!isConfigured()) {
      throw new Error("Supabase no está configurado.");
    }

    if (!global.supabase?.createClient) {
      throw new Error("La biblioteca supabase-js no pudo cargarse.");
    }

    const config = getConfig();

    client = global.supabase.createClient(
      config.url,
      config.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) throw sessionError;

    if (sessionData.session?.user) {
      currentUser = sessionData.session.user;
      return currentUser;
    }

    const { data, error } = await client.auth.signInAnonymously();

    if (error) throw error;
    if (!data.user) throw new Error("No se pudo crear la sesión anónima.");

    currentUser = data.user;
    return currentUser;
  }

  function mapDatabaseReport(row) {
    return {
      id: row.id,
      cityId: row.city_id,
      zoneId: row.zone_id,
      postalCode: row.postal_code,
      zoneLabel: row.zone_label,
      settlement: row.settlement_name,
      settlementType: row.settlement_type,
      status: row.status,
      tags: row.tags || [],
      confirmCount: row.confirm_count || 0,
      changeCount: row.change_count || 0,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      createdAt: row.created_at,
    };
  }

  async function fetchRecentReports(hours = 6) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");

    const since = new Date(
      Date.now() - hours * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await client
      .from("water_reports")
      .select(
        "id,city_id,zone_id,postal_code,zone_label,settlement_name,settlement_type,status,tags,latitude,longitude,confirm_count,change_count,created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    return (data || []).map(mapDatabaseReport);
  }

  async function fetchMyVotes() {
    if (!isConnected()) return {};

    const { data, error } = await client
      .from("report_votes")
      .select("report_id,vote_type");

    if (error) throw error;

    return Object.fromEntries(
      (data || []).map((vote) => [vote.report_id, vote.vote_type])
    );
  }

  async function publishReport(report) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");

    const payload = {
      reported_by: currentUser.id,
      city_id: report.cityId,
      zone_id: report.zoneId,
      postal_code: report.postalCode,
      zone_label: report.zoneLabel,
      settlement_name: report.settlement,
      settlement_type: report.settlementType,
      status: report.status,
      tags: report.tags,
      latitude: report.lat,
      longitude: report.lng,
    };

    const { data, error } = await client
      .from("water_reports")
      .insert(payload)
      .select(
        "id,city_id,zone_id,postal_code,zone_label,settlement_name,settlement_type,status,tags,latitude,longitude,confirm_count,change_count,created_at"
      )
      .single();

    if (error) throw error;

    return mapDatabaseReport(data);
  }

  async function publishVote(reportId, voteType) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");

    const { data, error } = await client
      .from("report_votes")
      .insert({
        report_id: reportId,
        voter_id: currentUser.id,
        vote_type: voteType,
      })
      .select("report_id,vote_type")
      .single();

    if (error) throw error;
    return data;
  }

  async function fetchReportHistory(cityId, limit = 50) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");

    let query = client
      .from("water_reports")
      .select(
        "id,reported_by,city_id,zone_id,postal_code,zone_label,settlement_name,settlement_type,status,tags,latitude,longitude,confirm_count,change_count,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 100));

    if (cityId) query = query.eq("city_id", cityId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => ({
      ...mapDatabaseReport(row),
      isMine: row.reported_by === currentUser?.id,
    }));
  }

  async function fetchMyReportHistory(limit = 50) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");

    const { data, error } = await client
      .from("water_reports")
      .select(
        "id,reported_by,city_id,zone_id,postal_code,zone_label,settlement_name,settlement_type,status,tags,latitude,longitude,confirm_count,change_count,created_at"
      )
      .eq("reported_by", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 100));

    if (error) throw error;
    return (data || []).map((row) => ({ ...mapDatabaseReport(row), isMine: true }));
  }

  async function fetchCommunityStats() {
    if (!isConnected()) throw new Error("Supabase no está conectado.");
    const { data, error } = await client.rpc("get_community_stats");
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      participants24h: Number(row.participants_24h || 0),
      reports24h: Number(row.reports_24h || 0),
      confirmations24h: Number(row.confirmations_24h || 0),
      changes24h: Number(row.changes_24h || 0),
      totalReports: Number(row.total_reports || 0),
      torreonReports24h: Number(row.torreon_reports_24h || 0),
      gomezReports24h: Number(row.gomez_reports_24h || 0),
      lerdoReports24h: Number(row.lerdo_reports_24h || 0),
    };
  }


  async function fetchMyAlerts() {
    if (!isConnected()) return [];

    const { data, error } = await client
      .from("alert_subscriptions")
      .select("id,city_id,zone_id,postal_code,settlement_name,enabled,last_signal_level,last_notified_at,created_at,updated_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      cityId: row.city_id,
      zoneId: row.zone_id,
      postalCode: row.postal_code,
      settlementName: row.settlement_name,
      enabled: row.enabled,
      lastSignalLevel: row.last_signal_level,
      lastNotifiedAt: row.last_notified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async function saveAlertSubscription(alert) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");

    let lookup = client
      .from("alert_subscriptions")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("zone_id", alert.zoneId);

    lookup = alert.settlementName
      ? lookup.eq("settlement_name", alert.settlementName)
      : lookup.is("settlement_name", null);

    const { data: existing, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) throw lookupError;

    const payload = {
      user_id: currentUser.id,
      city_id: alert.cityId,
      zone_id: alert.zoneId,
      postal_code: alert.postalCode,
      settlement_name: alert.settlementName || null,
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    const query = existing?.id
      ? client.from("alert_subscriptions").update(payload).eq("id", existing.id)
      : client.from("alert_subscriptions").insert(payload);

    const { data, error } = await query
      .select("id,city_id,zone_id,postal_code,settlement_name,enabled,last_signal_level,last_notified_at,created_at,updated_at")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      cityId: data.city_id,
      zoneId: data.zone_id,
      postalCode: data.postal_code,
      settlementName: data.settlement_name,
      enabled: data.enabled,
      lastSignalLevel: data.last_signal_level,
      lastNotifiedAt: data.last_notified_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async function removeAlertSubscription(alertId) {
    if (!isConnected()) throw new Error("Supabase no está conectado.");
    const { error } = await client
      .from("alert_subscriptions")
      .delete()
      .eq("id", alertId)
      .eq("user_id", currentUser.id);
    if (error) throw error;
  }

  async function markAlertNotified(alertId, signalLevel) {
    if (!isConnected()) return;
    const { error } = await client
      .from("alert_subscriptions")
      .update({
        last_signal_level: signalLevel,
        last_notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("user_id", currentUser.id);
    if (error) throw error;
  }

  function subscribeToReports(onChange) {
    if (!isConnected()) return null;

    if (reportsChannel) {
      client.removeChannel(reportsChannel);
    }

    reportsChannel = client
      .channel("radar-laguna-water-reports")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "water_reports",
        },
        onChange
      )
      .subscribe();

    return reportsChannel;
  }

  global.RadarSupabase = Object.freeze({
    isConfigured,
    isConnected,
    initialize,
    fetchRecentReports,
    fetchMyVotes,
    fetchCommunityStats,
    fetchReportHistory,
    fetchMyReportHistory,
    fetchMyAlerts,
    saveAlertSubscription,
    removeAlertSubscription,
    markAlertNotified,
    publishReport,
    publishVote,
    subscribeToReports,
  });
})(window);
