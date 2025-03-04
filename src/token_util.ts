import axios from "axios";
import Cookie from "universal-cookie";

export async function getTokenOrRefresh() {
  const cookie = new Cookie();
  const speechToken = cookie.get("speech-token");
  if (speechToken === undefined) {
    try {
      const res = await axios.get(
        "https://localhost:7049/api/speech/get-speech-token"
      );
      console.log(res.data);
      const token = res.data.token;
      const region = res.data.region;
      cookie.set("speech-token", region + ":" + token, {
        maxAge: 540,
        path: "/",
      });

      console.log("Token fetched from back-end: " + token);
      return { authToken: token, region: region };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        console.log(err.response.data);
        return { authToken: null, error: err.response.data };
      }
      console.log(err);
      return { authToken: null, error: "An unknown error occurred" };
    }
  } else {
    console.log("Token fetched from cookie: " + speechToken);
    const idx = speechToken.indexOf(":");
    return {
      authToken: speechToken.slice(idx + 1),
      region: speechToken.slice(0, idx),
    };
  }
}
