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
import { colors, spacing } from "../theme";

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
  { status: "done", label: "Done" },
];

const STUCK_THRESHOLD = 3;
const DRAG_ACTIVATE_PX = 6;

type ColumnRect = { x: number; y: number; width: number; height: number };

export function BoardsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<CardOut | null>(null);

  // Drag state. Refs for the gesture path; useState only for visual
  // re-renders (the column-hover highlight).
  const columnViewRefs = useRef<Record<CardStatus, View | null>>(
    {} as Record<CardStatus, View | null>
  );
  const columnRectsRef = useRef<Partial<Record<CardStatus, ColumnRect>>>({});
  const [hoverStatus, setHoverStatus] = useState<CardStatus | null>(null);

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
      if (map[c.status]) map[c.status].push(c);
    }
    return map;
  }, [cards]);

  async function moveTo(card: CardOut, status: CardStatus) {
    setMoving(null);
    if (card.status === status) return;
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
  boardRow: { padding: spacing.md, gap: spacing.md },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
  },
  columnHover: {
    borderColor: colors.primary,
    backgroundColor: "#1b2533",
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
    borderRadius: 6,
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
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
    borderRadius: 6,
    alignItems: "center",
  },
  sheetButtonCurrent: { backgroundColor: colors.border },
  sheetButtonText: { color: "#fff", fontWeight: "600" },
  cancel: { padding: spacing.md, alignItems: "center", marginTop: spacing.sm },
  cancelText: { color: colors.textMuted },
});
