from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allows access only to users whose role is ADMIN.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "ADMIN"
        )
