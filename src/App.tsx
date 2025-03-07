import React, { useState, useRef, useEffect } from "react";
import "./index.css";
import {
  CloudUploadOutlined,
  LinkOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import {
  Attachments,
  AttachmentsProps,
  Bubble,
  Sender,
  useXAgent,
  useXChat,
  Welcome,
} from "@ant-design/x";
import { Button, Space, type GetProp, type GetRef } from "antd";
import { getTokenOrRefresh } from "./token_util";
import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { createStyles } from "antd-style";

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 1000px;
      height: 722px;
      border-radius: ${token.borderRadius}px;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;

      .ant-prompts {
        color: ${token.colorText};
      }
    `,
    menu: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
    `,
    conversations: css`
      padding: 0 12px;
      flex: 1;
      overflow-y: auto;
    `,
    chat: css`
      height: 100%;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;
      position: relative;
    `,
    messages: css`
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      height: calc(100% - 160px); /* Adjust based on sender height */
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 4px;

      /* Remove justify-content: flex-end to allow scrolling to the top */
      /* Instead, add padding at the top to ensure there's space to scroll */
      padding-top: 20px;

      /* Hide scrollbar for Chrome, Safari and Opera */
      &::-webkit-scrollbar {
        display: none;
      }

      /* Hide scrollbar for IE, Edge and Firefox */
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
      position: sticky;
      bottom: 0%;
      background: ${token.colorBgContainer};
      margin-top: auto; /* Push to the bottom */
      width: 100%;
    `,
    logo: css`
      display: flex;
      height: 72px;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;

      img {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      span {
        display: inline-block;
        margin: 0 8px;
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      width: calc(100% - 24px);
      margin: 0 12px 24px 12px;
    `,
  };
});

type Message = {
  id: string;
  content: string;
  role: "user" | "agent";
};

interface SwaggerResponse {
  endpoint: string;
  schema: string;
  requiredValues: string[];
}

export type EndpointList = string[];

const App: React.FC = () => {
  const { styles } = useStyle();
  const [open, setOpen] = useState<boolean>(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, "items">>([]);
  const [text, setText] = useState<string>("");
  const [recording, setRecording] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let swaggerResponse : SwaggerResponse;

  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const openSwaggerBackendApiPage = () => {
    window.open("https://localhost:7049/swagger/index.html", "_blank"); // Open in a new tab
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const placeholderNode = (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="Hello, I'm Swagger To Chat"
        description="Base on Swagger API, I can help you to get required values for an endpoint."

        extra={
          <Space>
            <Button
              icon={<ShareAltOutlined />}
              onClick={openSwaggerBackendApiPage}
            />
          </Space>
        }
      />
    </Space>
  );

  const sttFromMic = async () => {
    try {
      const tokenObj = await getTokenOrRefresh();
      const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
        tokenObj?.authToken,
        tokenObj?.region
      );
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new speechsdk.SpeechRecognizer(
        speechConfig,
        audioConfig
      );

      setText("Listening...");

      recognizer.recognizeOnceAsync(async (result) => {
        if (result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          setText(result.text+" Speech recognized");
        } else {
          setText("Speech not recognized. Please try again.");
        }
      });
    } catch (error) {
      console.error("Speech recognition error:", error);
      setText("Error starting speech recognition.");
    } finally {
      setRecording(false);
    }
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content != "") {
        try {
          localStorage.setItem("swaggerJsonContent", content);
          console.log("Swagger JSON content saved to local storage");
          onRequest({
            id: Date.now().toString(),
            content: "file uploaded", // This will be caught by our useXAgent handler
            role: "user",
          });
        } catch (error) {
          console.error("Error saving to localStorage:", error);
          // Handle localStorage errors (e.g., quota exceeded)
        }
      }
    };
    reader.readAsText(file);
  };

  const fetchRequiredValues = async ({
    endpointName,
  }: {
    endpointName: string;
  }): Promise<SwaggerResponse | null> => {
    try {
      const swaggerJsonContent = localStorage.getItem("swaggerJsonContent");
      if (!swaggerJsonContent) {
        throw new Error(
          "Swagger JSON content is not available in localStorage"
        );
      }
      const swaggerJson = JSON.parse(swaggerJsonContent);
      const response = await fetch(
        "https://localhost:7049/api/Swagger/get-required-values",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ swaggerJson, endpointName }),
        }
      );
      if (!response.ok) {
        throw new Error("Error fetching required values");
      }
      const data: SwaggerResponse = await response.json();
      swaggerResponse = data;
      return data; // Return the response data
    } catch (error) {
      console.error("Error fetching required values:", error);
      return null; // Return null in case of error
    }
  };

  const sendSpeechToApi = async ({message}:{message:Message}) => {
    try {
      const swaggerJsonContent = localStorage.getItem("swaggerJsonContent");
      if (!swaggerJsonContent) {
        throw new Error(
          "Swagger JSON content is not available in localStorage"
        );
      }
      const swaggerJson = JSON.parse(swaggerJsonContent);
      const payload = {
        swaggerJson,
        swaggerResponse: swaggerResponse,
        speechValue: message.content,
      };

      console.log("Payload:", JSON.stringify(payload, null, 2));

      const apiResponse = await fetch(
        "https://localhost:7049/api/speech/callFeedback",
        {
          method: "POST",
          headers: {
            Accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! Status: ${apiResponse.status}`);
      }

      const responseData = await apiResponse.text();
      onRequest({
        id: Date.now().toString(),
        content: responseData,
        role: "agent",
      });
    } catch (error) {
      console.error("Error calling API:", error);
    }
  };

  const getEndpoints = async (): Promise<EndpointList> => {
    try {
      const payload = {
        swaggerJson: JSON.parse(
          localStorage.getItem("swaggerJsonContent") || ""
        ),
      };

      console.log("Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(
        "https://localhost:7049/api/Swagger/getEndpoints",
        {
          method: "POST",
          headers: {
            Accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData: EndpointList = await response.json();
      console.log("Endpoints fetched successfully:", responseData);
      return responseData;
    } catch (error) {
      console.error("Error fetching endpoints:", error);
      throw error;
    }
  };

  const renderMessage = (message: Message) => {
    const handleBubbleClick = (content: string) => {
      // const newMessage: Message = {
      //   id: Date.now().toString(),
      //   content,
      //   role: "user",
      // };
      // onRequest(newMessage);
      setText(content);
    };

    if (message.role === "agent") {
      // Render agent's message with click handler
      return (
        <Bubble
          key={message.id}
          content={message.content}
          onClick={() => handleBubbleClick(message.content)}
          style={{ cursor: "pointer" }} // Add cursor pointer to indicate clickable
        />
      );
    } else if (message.role === "user") {
      // Render user's message with click handler
      return (
        <Bubble
          key={message.id}
          content={message.content}
          placement="end" // Align user's message to the right
        />
      );
    }
    // Add more conditional renderings as needed
  };

  const handleSend = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
    };
    onRequest(message);
  };

  const [agent] = useXAgent({
    request: async (
      { message }: { message?: Message },
      {
        onSuccess,
        onError,
      }: {
        onSuccess: (response: Message) => void;
        onError: (error: Error) => void;
      }
    ) => {
      if (!message) {
        onError(new Error("Message is undefined"));
        return;
      }

      if (
        message.content.toLowerCase().includes("file uploaded") &&
        message.role === "user"
      ) {
        try {
          const fetchedEndpoints = await getEndpoints();
          // Use a unique ID for each endpoint by combining timestamp with index
          fetchedEndpoints.forEach((endpoint, index) => {
            console.log("Endpoint:", endpoint);
            onRequest({
              id: `${Date.now()}-${index}`, // Use combination of timestamp and index for uniqueness
              content: endpoint,
              role: "agent",
            });
          });
        } catch (error) {
          console.error("Error fetching endpoints:", error);
          onError(new Error("Failed to process the Swagger file. Please check the format and try again."));
        }
      }
      else if (
        (message.content.toLowerCase().includes("post") ||
          messages.length === 1) &&
        message.role === "user"
      ) {
        try {
          const data = await fetchRequiredValues({
            endpointName: message.content.split(" ")[1],
          });
          if (data) {
            const responseContent = `## Endpoint: ${data.endpoint}  \n\n` +
              `**Required values:**\n${data.requiredValues.length ? data.requiredValues.join(", ") : "None"}  \n\n` +
              `**Schema:**\n\`\`\`json\n${data.schema}\n\`\`\``;

            // Send response back to the chat
            onSuccess({
              id: `endpoint-${Date.now()}`, // Add prefix for endpoint responses
              content: responseContent,
              role: "agent",
            });
          } else {
            onError(new Error("Could not retrieve information for this endpoint. Please try another endpoint."));
          }
        } catch (error) {
          onError(error as Error);
        }
      }
      else if(
        message.content.toLowerCase().includes("speech recognized") &&
    message.role === "user"){
        sendSpeechToApi({ message });
      }
    },
  });

  const { onRequest, messages } = useXChat<Message>({ agent });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const senderHeader = (
    <Sender.Header
      title="Attachments"
      styles={{
        content: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      forceRender
    >
      <Attachments
        ref={attachmentsRef}
        beforeUpload={() => {
          if (items.length >= 1) {
            return false; // Prevent additional uploads
          }
          return false; // Prevent default upload behavior
        }}
        items={items}
        onChange={({ fileList }) => {
          setItems(fileList.slice(0, 1)); // Restrict to only one file
          if (fileList.length > 0) {
            handleFileRead(fileList[0].originFileObj as File);
          }
        }}
        placeholder={(type) =>
          type === "drop"
            ? {
                title:
                  items.length >= 1
                    ? "You can only upload one file"
                    : "Drop file here",
              }
            : {
                icon: <CloudUploadOutlined />,
                title:
                  items.length >= 1 ? "File already uploaded" : "Upload file",
                description:
                  items.length >= 1 ? "" : "Click or drag a file to upload",
              }
        }
        disabled={items.length >= 1}
      />
    </Sender.Header>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.chat}>
        <Bubble.List
          items={[{ content: placeholderNode, variant: "borderless" }]}
        />
        <div className={styles.messages}>
          {messages.map((message) => renderMessage(message.message))}
          <div ref={messagesEndRef} />{" "}
          {/* This empty div will be our scroll target */}
        </div>
        <Sender
          ref={senderRef}
          header={senderHeader}
          prefix={
            <Button
              type="text"
              icon={<LinkOutlined />}
              onClick={() => setOpen(!open)}
            />
          }
          value={text}
          onChange={setText}
          onPasteFile={(file: File) => {
            attachmentsRef.current?.upload(file);
            setOpen(true);
          }}
          onSubmit={() => {
            setText("");
            handleSend(text);
          }}
          allowSpeech={{
            recording,
            onRecordingChange: (nextRecording: boolean) => {
              console.log("Recording:", nextRecording);
              if (nextRecording) {
                sttFromMic();
              }
              setRecording(nextRecording);
            },
          }}
          className={styles.sender}
        />
      </div>
    </div>
  );
};

export default App;
