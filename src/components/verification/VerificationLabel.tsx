import { ValidationStatus } from "@/types/types";
import { Box, Text } from "@ledgerhq/react-ui";
import {
  CircledCrossSolidMedium,
  InfoAltFillMedium,
  WarningSolidMedium,
} from "@ledgerhq/react-ui/assets/icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

type Props = {
  verification: ValidationStatus;
  type?: "minimal" | "full";
};

const VerificationLabel = ({ verification, type = "full" }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const sharedStyle = {
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    columnGap: 3,
    marginTop: 5,
    paddingY: 2,
    paddingX: 4,
    width: "fit-content",
  };

  switch (verification) {
    case "VALID":
      return null;
    case "INVALID":
      return (
        <Box backgroundColor={colors.error.c90} {...sharedStyle}>
          <WarningSolidMedium size={20} color={"red"} />
          {type === "full" && (
            <Text color={"red"}>
              {t("sessionProposal.validation.invalid.label")}
            </Text>
          )}
        </Box>
      );
    case "SCAM":
      return (
        <Box backgroundColor={colors.error.c90} {...sharedStyle}>
          <CircledCrossSolidMedium
            size={type === "full" ? 20 : 12}
            color={"red"}
          />
          {type === "full" && (
            <Text color={"red"}>
              {t("sessionProposal.validation.scam.label")}
            </Text>
          )}
        </Box>
      );
    default:
      return (
        <Box backgroundColor={colors.warning.c90} {...sharedStyle}>
          <InfoAltFillMedium size={20} color={"orange"} />
          {type === "full" && (
            <Text color={"orange"}>
              {t("sessionProposal.validation.unknown.label")}
            </Text>
          )}
        </Box>
      );
  }
};

export default VerificationLabel;
