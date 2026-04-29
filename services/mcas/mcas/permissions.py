from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


class TierBasedPermission(permissions.BasePermission):
    """
    Enforce data tier access control based on agent authorization level.

    Data tiers:
    - Tier-0: PII (Proton/E2EE only, agents have NO access)
    - Tier-1: Restricted PII (agent-scoped access only)
    - Tier-2: De-identified (platform-visible agents)
    - Tier-3: Public (unrestricted)
    """

    # Mapping of agent roles to allowed tiers
    TIER_ACCESS = {
        'investigator': ['Tier-2', 'Tier-3'],
        'researcher': ['Tier-2', 'Tier-3'],
        'analyst': ['Tier-1', 'Tier-2', 'Tier-3'],
        'admin': ['Tier-1', 'Tier-2', 'Tier-3'],
        'public': ['Tier-3'],
    }

    def get_agent_tier_access(self, request):
        """Determine what tiers the requesting agent/user can access."""
        user = request.user

        # Anonymous users can only access Tier-3 (public)
        if not user or not user.is_authenticated:
            return ['Tier-3']

        # Check for agent-specific scopes (from JWT token)
        # TODO: Parse OAuth2 scopes from request.auth
        agent_role = getattr(user, 'agent_role', 'investigator')

        return self.TIER_ACCESS.get(agent_role, ['Tier-3'])

    def check_object_access(self, request, obj):
        """Verify user can access a specific object based on its tier."""
        allowed_tiers = self.get_agent_tier_access(request)

        # Check if object has data_tier attribute
        if not hasattr(obj, 'data_tier'):
            # Objects without tiers default to Tier-3 (public)
            return True

        if obj.data_tier not in allowed_tiers:
            raise PermissionDenied(
                f"You do not have access to {obj.data_tier} data. "
                f"Your access level allows: {', '.join(allowed_tiers)}"
            )

        # Tier-0 access is NEVER allowed to agents (Proton/E2EE only)
        if obj.data_tier == 'Tier-0':
            raise PermissionDenied(
                "Tier-0 data is restricted to Proton/E2EE only. "
                "Agents cannot access encrypted PII."
            )

        return True

    def has_permission(self, request, view):
        """Allow authenticated users; tier checks happen at object level."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check tier access for specific object."""
        return self.check_object_access(request, obj)


class MatterApprovalPermission(permissions.BasePermission):
    """
    Enforce HITL (Human-in-the-Loop) approval gates.
    Only authorized humans can approve matters for research/publication/referral.
    """

    def has_permission(self, request, view):
        # Only allow HITL actions for authenticated users with approval role
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.groups.filter(name='matter_approvers').exists()

    def has_object_permission(self, request, view, obj):
        # Verify user has approval authority for this matter's tier
        if obj.data_tier == 'Tier-0':
            return False  # Tier-0 never goes through approval workflow

        return request.user.groups.filter(name='matter_approvers').exists()


class DocumentReadOnlyForTier0(permissions.BasePermission):
    """
    Prevent creation/modification of Tier-0 documents via API.
    Tier-0 PII must come through Proton/E2EE workflows only.
    """

    def has_permission(self, request, view):
        # Allow read (safe) methods for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # POST/PUT/DELETE require approval role
        return request.user and request.user.is_authenticated and \
               request.user.groups.filter(name='document_admins').exists()

    def has_object_permission(self, request, view, obj):
        # Prevent modification of Tier-0 documents
        if request.method not in permissions.SAFE_METHODS and obj.data_tier == 'Tier-0':
            raise PermissionDenied("Tier-0 documents cannot be modified via API.")

        return True


class TaskAssignmentPermission(permissions.BasePermission):
    """
    Only task supervisors can assign tasks.
    Tasks with approval gates can only be assigned by admins.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # POST/PATCH require admin or supervisor role
        return request.user and request.user.is_authenticated and \
               (request.user.groups.filter(name='admins').exists() or \
                request.user.groups.filter(name='task_supervisors').exists())

    def has_object_permission(self, request, view, obj):
        # Approval-required tasks can only be touched by admins
        if obj.requires_approval and request.method != 'GET':
            return request.user.groups.filter(name='admins').exists()

        return True
