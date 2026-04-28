from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from ctm.views import BillingInvoiceReportView, BillingPaymentReportView, BillingSummaryReportView, CompanyUserViewSet, CorporatePortalContextView, CtmAuthLoginView, CtmAuthLogoutView, CtmAuthMeView, ItineraryViewSet, TravelerViewSet, TripBookingView, TripDocumentDetailView, TripDocumentListView, TripInvoiceView, TripMessageListView, TripPaymentDetailView, TripPaymentListView, TripQuoteView, TripRequestViewSet, TripTaskDetailView, TripTaskListView
from crm.views import AuthLoginView, AuthLogoutView, AuthMeView, ClientViewSet, LeadViewSet, PublicLeadCreateView, UserViewSet

router = DefaultRouter()
router.register("leads", LeadViewSet, basename="lead")
router.register("clients", ClientViewSet, basename="client")
router.register("users", UserViewSet, basename="user")
router.register("ctm/trip-requests", TripRequestViewSet, basename="ctm-trip-request")
router.register("ctm/travelers", TravelerViewSet, basename="ctm-traveler")
router.register("ctm/itineraries", ItineraryViewSet, basename="ctm-itinerary")
router.register("ctm/company-users", CompanyUserViewSet, basename="ctm-company-user")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("api/auth/logout/", AuthLogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("api/ctm/auth/login/", CtmAuthLoginView.as_view(), name="ctm-auth-login"),
    path("api/ctm/auth/logout/", CtmAuthLogoutView.as_view(), name="ctm-auth-logout"),
    path("api/ctm/auth/me/", CtmAuthMeView.as_view(), name="ctm-auth-me"),
    path("api/public/leads/", PublicLeadCreateView.as_view(), name="public-leads"),
    path("api/ctm/context/", CorporatePortalContextView.as_view(), name="ctm-context"),
    path("api/ctm/reports/billing/summary/", BillingSummaryReportView.as_view(), name="ctm-billing-summary-report"),
    path("api/ctm/reports/billing/invoices/", BillingInvoiceReportView.as_view(), name="ctm-billing-invoices-report"),
    path("api/ctm/reports/billing/payments/", BillingPaymentReportView.as_view(), name="ctm-billing-payments-report"),
    path("api/ctm/trip-requests/<str:reference_code>/quote/", TripQuoteView.as_view(), name="ctm-trip-quote"),
    path("api/ctm/trip-requests/<str:reference_code>/booking/", TripBookingView.as_view(), name="ctm-trip-booking"),
    path("api/ctm/trip-requests/<str:reference_code>/invoice/", TripInvoiceView.as_view(), name="ctm-trip-invoice"),
    path("api/ctm/trip-requests/<str:reference_code>/payments/", TripPaymentListView.as_view(), name="ctm-trip-payments"),
    path("api/ctm/payments/<uuid:payment_id>/", TripPaymentDetailView.as_view(), name="ctm-payment-detail"),
    path("api/ctm/trip-requests/<str:reference_code>/tasks/", TripTaskListView.as_view(), name="ctm-trip-tasks"),
    path("api/ctm/tasks/<uuid:task_id>/", TripTaskDetailView.as_view(), name="ctm-task-detail"),
    path("api/ctm/trip-requests/<str:reference_code>/documents/", TripDocumentListView.as_view(), name="ctm-trip-documents"),
    path("api/ctm/documents/<uuid:document_id>/", TripDocumentDetailView.as_view(), name="ctm-document-detail"),
    path("api/ctm/trip-requests/<str:reference_code>/messages/", TripMessageListView.as_view(), name="ctm-trip-messages"),
    path("api/", include(router.urls)),
]
