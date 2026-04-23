from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from crm.views import AuthLoginView, AuthLogoutView, AuthMeView, ClientViewSet, LeadViewSet, PublicLeadCreateView, UserViewSet

router = DefaultRouter()
router.register("leads", LeadViewSet, basename="lead")
router.register("clients", ClientViewSet, basename="client")
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("api/auth/logout/", AuthLogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("api/public/leads/", PublicLeadCreateView.as_view(), name="public-leads"),
    path("api/", include(router.urls)),
]
