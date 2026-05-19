import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CardOut,
  CardStatus,
  listCards,
  updateCard,
} from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing, PILLAR_COLOR } from "../theme";

/**
 * Spec §9 Boards / Kanban — status columns + drag-and-drop move.
 *
 * Interactions:
 *   • Tap a card        → CardDetail (full edit)
 *   • Long-press a card → quick "Move to…" modal (accessibility fallback)
 *   • Drag a card       → real DnD via PanResponder. After the finger
 *                          moves >6px from the card's origin we capture
 *                          the gesture, render the card following the
 *                          touch, highlight the column under the finger,
 *                          and on release call updateCard.
 *
 * Stuck-card detection (spec §2) uses `moved_count` from the backend.
 */

const COLUMNS: { status: CardStatus; label: string }[] = [
  { status: "inbox", label: "Inbox" },
  { status: "planned", label: "Planned" },
  { status: "today", label: "Today" },
  { status: "in_progress_my_side", label: "Doing" },
  { status: "in_progress_other_side", label: "Waiting" },
  { status: "done", label: "Done" },
  { status: "review", label: "Review" },
];

const STUCK_THRESHOLD = 3;
const DRAG_ACTIVATE_PX = 6;

type ColumnRect = { x: number; y: number; width: number; height: number };

const LIFE_AREAS = [
  { value: "health_energy", label: "Health" },
  { value: "mind_healing", label: "Mind" },
  { value: "money_freedom", label: "Money" },
  { value: "work_skills", label: "Work" },
  { value: "home_property", label: "Home" },
  { value: "joy_culture", label: "Joy" },
  { value: "family", label: "Family" },
] as const;

const ENERGIES = ["low", "medium", "high"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

export function BoardsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<CardOut | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterEnergy, setFilterEnergy] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const activeFilterCount =
    (filterArea ? 1 : 0) + (filterEnergy ? 1 : 0) + (filterPriority ? 1 : 0);

  // Drag state. Refs for the gesture path; useState only for visual
  // re-renders (the column-hover highlight).
  const columnViewRefs = useRef<Record<CardStatus, View | null>>(
    {} as Record<CardStatus, View | null>
  );
  const columnRectsRef = useRef<Partial<Record<CardStatus, ColumnRect>>>({});
  const [hoverStatus, setHoverStatus] = useState<CardStatus | null>(null);

  // Carryover review modal
  const [carryoverCard, setCarryoverCard] = useState<{
    card: CardOut;
    targetStatus: CardStatus;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCards(await listCards(DEV_USER_ID));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load cards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const grouped = useMemo(() => {
    const map: Record<string, CardOut[]> = {};
    for (const col of COLUMNS) map[col.status] = [];
    for (const c of cards) {
      if (filterArea && c.life_area !== filterArea) continue;
      if (filterEnergy && c.energy_required !== filterEnergy) continue;
      if (filterPriority && c.priority !== filterPriority) continue;
      if (map[c.status]) map[c.status].push(c);
    }
    return map;
  }, [cards, filterArea, filterEnergy, filterPriority]);

  async function moveTo(card: CardOut, status: CardStatus) {
    setMoving(null);
    if (card.status === status) return;

    // Carryover rule: card moved 3+ times → force review before allowing move
    if (card.moved_count >= STUCK_THRESHOLD && status !== "done" && status !== "deleted") {
      setCarryoverCard({ card, targetStatus: status });
      return;
    }

    await doMove(card, status);
  }

  async function doMove(card: CardOut, status: CardStatus) {
    setCarryoverCard(null);
    // Optimistic update.
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, status, moved_count: c.moved_count + 1 } : c
      )
    );
    try {
      const updated = await updateCard(card.id, { status });
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e: any) {
      Alert.alert("Move failed", e?.message ?? "Unknown error");
      load();
    }
  }

  function handleCarryoverDecision(decision: "move" | "done" | "delete" | "split" | "cancel") {
    if (!carryoverCard) return;
    const { card, targetStatus } = carryoverCard;
    switch (decision) {
      case "move":
        doMove(card, targetStatus);
        break;
      case "done":
        doMove(card, "done" as CardStatus);
        break;
      case "delete":
        doMove(card, "deleted" as CardStatus);
        break;
      case "split":
        setCarryoverCard(null);
        navigation.navigate("CardDetail", { cardId: card.id });
        break;
      case "cancel":
        setCarryoverCard(null);
        break;
    }
  }

  // Snapshot every column's screen-space rect. Called when a drag begins
  // and on each scroll so hit-testing stays accurate.
  const measureColumns = useCallback(() => {
    for (const col of COLUMNS) {
      const ref = columnViewRefs.current[col.status];
      if (ref && typeof (ref as any).measureInWindow === "function") {
        (ref as any).measureInWindow(
          (x: number, y: number, width: number, height: number) => {
            columnRectsRef.current[col.status] = { x, y, width, height };
          }
        );
      }
    }
  }, []);

  const findColumnAt = useCallback(
    (pageX: number, pageY: number): CardStatus | null => {
      for (const col of COLUMNS) {
        const r = columnRectsRef.current[col.status];
        if (!r) continue;
        if (
          pageX >= r.x &&
          pageX <= r.x + r.width &&
          pageY >= r.y &&
          pageY <= r.y + r.height
        ) {
          return col.status;
        }
      }
      return null;
    },
    []
  );

  const onCardDrop = useCallback(
    (card: CardOut, pageX: number, pageY: number) => {
      const target = findColumnAt(pageX, pageY);
      setHoverStatus(null);
      if (target && target !== card.status) {
        moveTo(card, target);
      }
    },
    [findColumnAt]
  );

  const onCardDragMove = useCallback(
    (pageX: number, pageY: number) => {
      const status = findColumnAt(pageX, pageY);
      setHoverStatus((prev) => (prev === status ? prev : status));
    },
    [findColumnAt]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Filter toggle */}
      <View style={styles.filterToggleRow}>
        <Pressable
          style={styles.filterToggle}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text style={styles.filterToggleText}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </Pressable>
        {activeFilterCount > 0 && (
          <Pressable
            onPress={() => {
              setFilterArea(null);
              setFilterEnergy(null);
              setFilterPriority(null);
            }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Life area</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {LIFE_AREAS.map((a) => (
              <Pressable
                key={a.value}
                style={[
                  styles.filterChip,
                  filterArea === a.value && styles.filterChipOn,
                ]}
                onPress={() =>
                  setFilterArea((v) => (v === a.value ? null : a.value))
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterArea === a.value && styles.filterChipTextOn,
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Energy</Text>
          <View style={styles.filterChips}>
            {ENERGIES.map((e) => (
              <Pressable
                key={e}
                style={[
                  styles.filterChip,
                  filterEnergy === e && styles.filterChipOn,
                ]}
                onPress={() => setFilterEnergy((v) => (v === e ? null : e))}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterEnergy === e && styles.filterChipTextOn,
                  ]}
                >
                  {e}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Priority</Text>
          <View style={styles.filterChips}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.filterChip,
                  filterPriority === p && styles.filterChipOn,
                ]}
                onPress={() => setFilterPriority((v) => (v === p ? null : p))}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterPriority === p && styles.filterChipTextOn,
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* WIP insight — matches prototype "Flow insight" card */}
      {(() => {
        const inProgress = (grouped["today"]?.length ?? 0) + (grouped["in_progress_my_side"]?.length ?? 0);
        const stuckCount = cards.filter(c => c.moved_count >= STUCK_THRESHOLD).length;
        if (inProgress > 3 || stuckCount > 0) {
          return (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightTitle}>Flow insight</Text>
                {inProgress > 3 && (
                  <View style={styles.wipBadge}>
                    <Text style={styles.wipBadgeText}>WIP {inProgress}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.insightBody}>
                {inProgress > 3
                  ? `You have ${inProgress} tasks in Today + Doing. That is congestion, not progress. Finish or move cards before adding more.`
                  : ""}
                {stuckCount > 0
                  ? `${inProgress > 3 ? " " : ""}${stuckCount} card${stuckCount > 1 ? "s" : ""} moved ${STUCK_THRESHOLD}+ times — split or delete.`
                  : ""}
              </Text>
            </View>
          );
        }
        return null;
      })()}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardRow}
        onScroll={measureColumns}
        scrollEventThrottle={32}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {COLUMNS.map((col) => {
          const items = grouped[col.status] ?? [];
          const isHover = hoverStatus === col.status;
          return (
            <View
              key={col.status}
              ref={(node) => {
                columnViewRefs.current[col.status] = node;
              }}
              onLayout={measureColumns}
              style={[styles.column, isHover && styles.columnHover]}
            >
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>{col.label}</Text>
                <Text style={styles.columnCount}>{items.length}</Text>
              </View>
              <ScrollView
                style={styles.columnBody}
                contentContainerStyle={styles.columnBodyContent}
              >
                {items.length === 0 ? (
                  <Text style={styles.empty}>—</Text>
                ) : (
                  items.map((card) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      onTap={() =>
                        navigation.navigate("CardDetail", {
                          cardId: card.id,
                        })
                      }
                      onLongPress={() => setMoving(card)}
                      onDragStart={measureColumns}
                      onDragMove={onCardDragMove}
                      onDragEnd={onCardDrop}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      <MoveModal
        card={moving}
        onClose={() => setMoving(null)}
        onPick={(status) => moving && moveTo(moving, status)}
      />

      {/* Carryover Review Modal — spec §9.4 rule 6: 3-carryover forced review */}
      <Modal
        visible={!!carryoverCard}
        transparent
        animationType="slide"
        onRequestClose={() => setCarryoverCard(null)}
      >
        <View style={styles.carryoverOverlay}>
          <View style={styles.carryoverSheet}>
            <Text style={styles.carryoverTitle}>⚠️ Stuck card review</Text>
            <Text style={styles.carryoverSubtitle}>
              This card has been moved {carryoverCard?.card.moved_count ?? 0} times without being completed.
            </Text>
            <View style={styles.carryoverCardPreview}>
              <Text style={styles.carryoverCardTitle}>
                {carryoverCard?.card.title}
              </Text>
              {carryoverCard?.card.description ? (
                <Text style={styles.carryoverCardDesc} numberOfLines={2}>
                  {carryoverCard.card.description}
                </Text>
              ) : null}
            </View>
            <Text style={styles.carryoverQuestion}>
              What would you like to do?
            </Text>
            <View style={styles.carryoverActions}>
              <Pressable
                style={styles.carryoverBtn}
                onPress={() => handleCarryoverDecision("move")}
              >
                <Text style={styles.carryoverBtnText}>Move anyway</Text>
              </Pressable>
              <Pressable
                style={styles.carryoverBtn}
                onPress={() => handleCarryoverDecision("done")}
              >
                <Text style={styles.carryoverBtnText}>✅ Mark done</Text>
              </Pressable>
              <Pressable
                style={styles.carryoverBtn}
                onPress={() => handleCarryoverDecision("split")}
              >
                <Text style={styles.carryoverBtnText}>✂️ Split / Edit</Text>
              </Pressable>
              <Pressable
                style={styles.carryoverBtn}
                onPress={() => handleCarryoverDecision("delete")}
              >
                <Text style={[styles.carryoverBtnText, { color: "#bf6b62" }]}>
                  🗑 Delete
                </Text>
              </Pressable>
              <Pressable
                style={[styles.carryoverBtn, { borderColor: colors.border }]}
                onPress={() => handleCarryoverDecision("cancel")}
              >
                <Text style={[styles.carryoverBtnText, { color: colors.textMuted }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ----------------------------------------------------------------------
// DraggableCard
// ----------------------------------------------------------------------
function DraggableCard({
  card,
  onTap,
  onLongPress,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  card: CardOut;
  onTap: () => void;
  onLongPress: () => void;
  onDragStart: () => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: (card: CardOut, pageX: number, pageY: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > DRAG_ACTIVATE_PX ||
          Math.abs(gs.dy) > DRAG_ACTIVATE_PX,
        onPanResponderGrant: () => {
          draggingRef.current = true;
          setDragging(true);
          pan.setValue({ x: 0, y: 0 });
          onDragStart();
        },
        onPanResponderMove: (e, gs) => {
          pan.setValue({ x: gs.dx, y: gs.dy });
          onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY);
        },
        onPanResponderRelease: (e) => {
          onDragEnd(card, e.nativeEvent.pageX, e.nativeEvent.pageY);
          // Spring back; if the card moved column the parent will
          // re-render it in the new column and the spring is invisible.
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            speed: 20,
            bounciness: 6,
          }).start(() => {
            draggingRef.current = false;
            setDragging(false);
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            speed: 20,
          }).start(() => {
            draggingRef.current = false;
            setDragging(false);
          });
        },
      }),
    [card, onDragEnd, onDragMove, onDragStart]
  );

  return (
    <Animated.View
      style={[
        { transform: pan.getTranslateTransform() },
        dragging && styles.cardDragging,
      ]}
      {...responder.panHandlers}
    >
      <Pressable
        onPress={() => {
          if (!draggingRef.current) onTap();
        }}
        onLongPress={() => {
          if (!draggingRef.current) onLongPress();
        }}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.card,
          card.life_area && { borderLeftWidth: 4, borderLeftColor: PILLAR_COLOR[card.life_area] ?? colors.border },
          card.moved_count >= STUCK_THRESHOLD && styles.stuck,
          pressed && !dragging && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.cardTitle} numberOfLines={3}>
          {card.title}
        </Text>
        {card.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {card.description}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>
            {card.type}
            {card.life_area ? ` · ${card.life_area}` : ""}
          </Text>
          {card.moved_count >= STUCK_THRESHOLD ? (
            <Text style={styles.stuckBadge}>
              stuck × {card.moved_count}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------
// Move modal (long-press fallback)
// ----------------------------------------------------------------------
function MoveModal({
  card,
  onClose,
  onPick,
}: {
  card: CardOut | null;
  onClose: () => void;
  onPick: (status: CardStatus) => void;
}) {
  return (
    <Modal
      visible={!!card}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Move card</Text>
          {card && (
            <Text style={styles.sheetSubtitle} numberOfLines={2}>
              {card.title}
            </Text>
          )}
          <View style={styles.sheetButtons}>
            {COLUMNS.map((col) => {
              const current = card?.status === col.status;
              return (
                <Pressable
                  key={col.status}
                  style={[
                    styles.sheetButton,
                    current && styles.sheetButtonCurrent,
                  ]}
                  disabled={current}
                  onPress={() => onPick(col.status)}
                >
                  <Text style={styles.sheetButtonText}>
                    {col.label}
                    {current ? " (here)" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const COLUMN_WIDTH = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  filterToggle: {
    paddingVertical: spacing.xs,
  },
  filterToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  clearText: { color: colors.danger, fontSize: 12 },
  filterPanel: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
  },
  filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.textMuted, fontSize: 11 },
  filterChipTextOn: { color: "#fff", fontWeight: "600" },
  boardRow: { padding: spacing.md, gap: spacing.md },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.sm,
  },
  columnHover: {
    borderColor: colors.primary,
    backgroundColor: "#ebe4d8",
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  columnTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  columnCount: { color: colors.textMuted, fontSize: 12 },
  columnBody: { maxHeight: "100%" },
  columnBodyContent: { gap: spacing.sm, paddingBottom: spacing.md },
  empty: { color: colors.textMuted, padding: spacing.md, textAlign: "center" },
  card: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
  },
  cardDragging: {
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    opacity: 0.92,
  },
  stuck: { borderColor: colors.warning },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  cardDesc: {
    color: colors.text,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardMeta: { color: colors.textMuted, fontSize: 10, flex: 1 },
  stuckBadge: { color: colors.warning, fontSize: 10, fontWeight: "600" },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(45,40,34,0.42)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  sheetButtons: { gap: spacing.sm },
  sheetButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetButtonCurrent: { backgroundColor: colors.border },
  sheetButtonText: { color: "#fff", fontWeight: "600" },
  cancel: { padding: spacing.md, alignItems: "center", marginTop: spacing.sm },
  cancelText: { color: colors.textMuted },
  // Insight card
  insightCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  wipBadge: {
    backgroundColor: "#f3eadc",
    borderWidth: 1,
    borderColor: "#dfcfb8",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wipBadgeText: { fontSize: 11, fontWeight: "700", color: colors.warning },
  // Carryover review modal
  carryoverOverlay: {
    flex: 1,
    backgroundColor: "rgba(45,40,34,0.42)",
    justifyContent: "flex-end",
  },
  carryoverSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    padding: spacing.lg,
    paddingBottom: 32,
    gap: spacing.md,
  },
  carryoverTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  carryoverSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  carryoverCardPreview: {
    backgroundColor: colors.bg,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  carryoverCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  carryoverCardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  carryoverQuestion: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  carryoverActions: {
    gap: spacing.sm,
  },
  carryoverBtn: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
  },
  carryoverBtnText: {
    fontWeight: "600",
    color: colors.text,
    fontSize: 14,
  },
});
