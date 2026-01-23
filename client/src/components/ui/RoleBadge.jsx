function RoleBadge({ role }) {
  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    organizer: "bg-blue-100 text-blue-700",
    user: "bg-gray-100 text-gray-700",
  };

  const roleLabels = {
    admin: "Admin",
    organizer: "Organizer",
    user: "User",
  };

  const colorClass = roleColors[role] || roleColors.user;
  const label = roleLabels[role] || "User";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default RoleBadge;
