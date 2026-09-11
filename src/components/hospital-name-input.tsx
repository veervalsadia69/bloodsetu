import { useId } from "react";

import { Input } from "@/components/ui/input";
import { AHMEDABAD_HOSPITALS } from "@/lib/ahmedabad-hospitals";

type HospitalNameInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
};

// Suggests known Ahmedabad hospitals while still allowing any name to be typed.
export function HospitalNameInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  className,
  name,
}: HospitalNameInputProps) {
  const listId = useId();
  return (
    <>
      <Input
        id={id}
        name={name}
        list={listId}
        className={className ?? "h-12"}
        placeholder={placeholder ?? "e.g. Civil Hospital Ahmedabad (Asarwa)"}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {AHMEDABAD_HOSPITALS.map((hospital) => (
          <option key={hospital} value={hospital} />
        ))}
      </datalist>
    </>
  );
}
