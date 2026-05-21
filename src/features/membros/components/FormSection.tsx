type FormSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function FormSection({
  title,
  children,
}: FormSectionProps) {
  return (
    <section className="space-y-4">
      <div className="border-b pb-2">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}