"use client";

import IonIcon from "@/components/IonIcon";
import { SUBJECT_ICON_NAMES } from "@/lib/ionicons";
import { Button, Popover, theme as antdTheme } from "antd";
import { useState } from "react";

/**
 * 科目图标选择器：值存 Ionicons 名称（如 calculator-outline），
 * 后台用同名字体渲染，移动端交给 @expo/vector-icons，保证两端一致。
 */
interface IconPickerProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, disabled }) => {
  const { token } = antdTheme.useToken();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={
        <div style={{ width: 336 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 4,
              maxHeight: 240,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {SUBJECT_ICON_NAMES.map((name) => (
              <Button
                key={name}
                type={value === name ? "primary" : "text"}
                onClick={() => {
                  onChange?.(name);
                  setOpen(false);
                }}
                style={{ paddingInline: 0 }}
                title={name}
              >
                <IonIcon name={name} size={18} />
              </Button>
            ))}
          </div>
          <Button
            block
            size="small"
            style={{ marginTop: 8 }}
            onClick={() => {
              onChange?.(null);
              setOpen(false);
            }}
          >
            清除图标
          </Button>
        </div>
      }
    >
      <Button
        disabled={disabled}
        style={{
          width: "100%",
          height: 32,
          justifyContent: "flex-start",
          fontWeight: "normal",
          paddingInline: 11,
        }}
      >
        {value ? (
          <IonIcon name={value} size={18} />
        ) : (
          <span style={{ color: token.colorTextPlaceholder }}>选择图标</span>
        )}
      </Button>
    </Popover>
  );
};

export default IconPicker;
