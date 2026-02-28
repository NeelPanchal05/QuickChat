import React from "react";
import { Check, CheckCheck } from "lucide-react";

export default function MessageReadStatus({ status, size = 16 }) {
  const iconProps = { size, className: "inline ml-1" };

  switch (status) {
    case "sent":
      return <Check {...iconProps} className="text-gray-500" />;
    case "delivered":
      return <CheckCheck {...iconProps} className="text-[#A1A1AA]" />;
    case "read":
      return <CheckCheck {...iconProps} className="text-[#7000FF]" />;
    default:
      return null;
  }
}
