from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.schemas.waste import WasteRecordCreate, WasteRecordResponse
from app.schemas.pickup import (
    PickupRequestCreate,
    PickupRequestResponse,
    NearbyCollectorInfo,
    PickupAssignRequest
)
from app.schemas.location import LocationUpdateRequest, CollectorLocationResponse
from app.schemas.analytics import (
    MLPredictRequest,
    MLPredictResponse,
    AnalyticsOverview,
    CategoryDistributionItem,
    PriorityDistributionItem,
    StatusDistributionItem,
    WasteTrendItem,
    MLMetricsResponse
)
from app.schemas.route import (
    RouteOptimizeRequest,
    RouteStopResponse,
    OptimizedRouteResponse,
    RouteConfirmRequest
)
from app.schemas.audit import (
    WasteAuditRecordResponse,
    SortingWarningResponse,
    CorrectionHistoryResponse,
    MonthlyAuditSummary,
    WasteCorrectionRequest,
    AdminSystemAuditOverview
)
