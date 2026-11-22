import { getRequestConfig } from "next-intl/server";
import messages from "../messages/it.json";

export default getRequestConfig(async () => ({ locale: "it", messages }));
