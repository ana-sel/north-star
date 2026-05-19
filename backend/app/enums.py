from enum import Enum


class PrivacyLevel(str, Enum):
    """Privacy classification applied to every data item.

    Defined in spec §7.3. Drives Local AI Gateway routing and
    human-approval gates.
    """

    PUBLIC = "public"
    NORMAL = "normal"
    PRIVATE = "private"
    SENSITIVE = "sensitive"
    NEVER_EXTERNAL = "never_external"


class CardLevel(str, Enum):
    VISION = "vision"
    GOAL = "goal"
    PROJECT = "project"
    MILESTONE = "milestone"
    TASK = "task"
    SUBTASK = "subtask"
    FOCUS_BLOCK = "focus_block"


class CardType(str, Enum):
    THOUGHT = "thought"
    GOAL = "goal"
    TASK = "task"
    HABIT = "habit"
    HEALTH = "health"
    MONEY = "money"
    DIARY = "diary"
    RESEARCH = "research"
    DECISION = "decision"


class CardStatus(str, Enum):
    INBOX = "inbox"
    FILTERED = "filtered"
    PLANNED = "planned"
    IN_PROGRESS_MY_SIDE = "in_progress_my_side"
    IN_PROGRESS_OTHER_SIDE = "in_progress_other_side"
    TODAY = "today"
    DONE = "done"
    LATER = "later"
    DELETED = "deleted"
    REVIEW = "review"
    ARCHIVED = "archived"


class LifeArea(str, Enum):
    HEALTH_ENERGY = "health_energy"
    MIND_HEALING = "mind_healing"
    MONEY_FREEDOM = "money_freedom"
    WORK_SKILLS = "work_skills"
    HOME_PROPERTY = "home_property"
    JOY_CULTURE = "joy_culture"
    FAMILY = "family"
    CONTRIBUTION = "contribution"
    APP_BUILDING = "app_building"


class EnergyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EmbeddingStatus(str, Enum):
    NOT_EMBEDDED = "not_embedded"
    EMBEDDED = "embedded"
    NEEDS_UPDATE = "needs_update"
