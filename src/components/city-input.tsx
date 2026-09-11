import { useId } from "react";

import { Input } from "@/components/ui/input";
import { INDIAN_CITIES } from "@/lib/indian-cities";

type CityInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
};

// A plain input with a native datalist — mobile-friendly city suggestions,
// while still allowing any city the user types.
export function CityInput({ id, value, onChange, placeholder, required, className, name }: CityInputProps) {
  const listId = useId();
  return (
    <>
      <Input
        id={id}
        name={name}
        list={listId}
        className={className ?? "h-12"}
        placeholder={placeholder ?? "e.g. Mumbai"}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="address-level2"
      />
      <datalist id={listId}>
        {INDIAN_CITIES.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
    </>
  );
}
