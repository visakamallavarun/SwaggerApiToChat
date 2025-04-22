import React, { useState, useRef, useEffect } from "react";
import "./index.css";
import {
  ApiOutlined,
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
import {
  Button,
  Layout,
  Space,
  type GetProp,
  type GetRef,
  Collapse,
  Input,
  Menu,
  Card,
  List,
  Tooltip,
  Typography,
} from "antd";
import { getTokenOrRefresh } from "./token_util";
import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";
import { createStyles } from "antd-style";
import ReactMarkdown from "react-markdown";
import { Content, Header } from "antd/es/layout/layout";
import axios from "axios";

const useStyle = createStyles(({ token, css }) => ({
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
  menuHorizontal: css`
    margin-bottom: 16px;
  `,
  header: css`
    position: fixed;
    top: 0;
    z-index: 1000;
    width: 100%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background: #001529;
    color: #fff;
  `,
  headerLogo: css`
    display: flex;
    align-items: center;
    img {
      height: 40px;
      margin-right: 16px;
    }
    text {
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      margin-top: 8px;
      margin-left: 20px;
    }
  `,
  sider: css`
    background: #fff;
  `,
  chatContent: css`
    padding: 0px;
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
    height: calc(100% - 160px);
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    padding-top: 20px;
    &::-webkit-scrollbar {
      display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
  `,
  sender: css`
    box-shadow: ${token.boxShadow};
    position: sticky;
    bottom: 0%;
    background: ${token.colorBgContainer};
    margin-top: auto;
    width: 100%;
  `,
  rightSider: css`
    height: 100%;
    display: flex;
    flex-direction: column;
  `,
  tabContent: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  `,
}));

type Message = {
  id: string;
  content: string;
  role: "user" | "agent";
};

export interface ChatResponse {
  response: string;
  speachResponse?: string;
  debugerResponse?: string;
}

export type EndpointList = string[];

const { Panel } = Collapse;
const QueryStringComponent: React.FC<{
  queryParams: Record<string, string>;
  setQueryParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({ queryParams, setQueryParams }) => {
  const [newKey, setNewKey] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");

  const storeQueryParams = async (updatedParams: Record<string, string>) => {
    try {
      const response = await axios.post("https://localhost:7049/api/speech", {
        params: updatedParams,
      });
      console.log("Successfully stored query params:", response.data);
    } catch (error) {
      console.error("Failed to store query params:", error);
    }
  };

  const updateQueryParams = (updatedParams: Record<string, string>) => {
    setQueryParams(updatedParams);
    storeQueryParams(updatedParams); // Post updated queryParams
  };

  const handleAddQueryParam = () => {
    if (newKey.trim() && newValue.trim()) {
      const updatedParams = {
        ...queryParams,
        [newKey.trim()]: newValue.trim(),
      };
      updateQueryParams(updatedParams);
      setNewKey("");
      setNewValue("");
    }
  };

  const handleDeleteQueryParam = (key: string) => {
    const updatedParams = { ...queryParams };
    delete updatedParams[key];
    updateQueryParams(updatedParams);
  };

  const handleEditQueryParam = (key: string, value: string) => {
    const updatedParams = { ...queryParams, [key]: value };
    updateQueryParams(updatedParams);
  };

  return (
    <div>
      <h3>Query Parameters</h3>
      <Collapse>
        {Object.entries(queryParams).map(([key, value]) => (
          <Panel
            header={key}
            key={key}
            extra={
              <Button
                type="link"
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteQueryParam(key);
                }}
              >
                Delete
              </Button>
            }
          >
            <Input
              value={value}
              onChange={(e) => handleEditQueryParam(key, e.target.value)}
            />
          </Panel>
        ))}
      </Collapse>
      <Input
        placeholder="Key"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value)}
        style={{ marginTop: "8px" }}
      />
      <Input
        placeholder="Value"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        style={{ marginTop: "8px" }}
      />
      <Button
        type="primary"
        style={{ marginTop: "8px" }}
        onClick={handleAddQueryParam}
      >
        Add Query Param
      </Button>
    </div>
  );
};

const DebugConsoleComponent: React.FC<{ debugData: string[] }> = ({
  debugData,
}) => {
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "green";
    if (status >= 400 && status < 500) return "orange";
    if (status >= 500) return "red";
    return "blue";
  };

  const extractStatusCode = (debug: string): number => {
    try {
      const parsed = JSON.parse(debug);
      return parsed.status || 200; // Default to 200 if no status is found
    } catch {
      return 200; // Default to 200 for non-JSON strings
    }
  };

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        border: "1px solid #ddd",
        padding: "16px",
        background: "#f9f9f9",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3>Debug Console</h3>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {debugData.map((debug, index) => {
          const statusCode = extractStatusCode(debug);
          return (
            <div
              key={index}
              style={{
                marginBottom: "8px",
                padding: "8px",
                borderRadius: "4px",
                background: "#fff",
                border: `1px solid ${getStatusColor(statusCode)}`,
              }}
            >
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(JSON.parse(debug), null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuickActionsListComponent: React.FC<{
  actions: string[];
  onRequest: (message: Message) => void;
}> = ({ actions, onRequest }) => {
  const { Text } = Typography;

  const handleClick = (endpoint: string) => {
    console.log(`Selected endpoint: ${endpoint}`);
    onRequest({
      id: Date.now().toString(),
      content: `${endpoint}`,
      role: "user",
    });
  };

  return (
    <Card
      title="🚀 Quick API Actions"
      bordered={false}
      style={{ width: "100%" }}
    >
      <List
        dataSource={actions}
        renderItem={(endpoint) => (
          <Tooltip title="Click to select endpoint" placement="right">
            <List.Item
              onClick={() => handleClick(endpoint)}
              style={{
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "8px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "#f0f5ff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "transparent";
              }}
            >
              <ApiOutlined style={{ color: "#1890ff", marginRight: 8 }} />
              <Text style={{ textAlign: "left" }}>{endpoint}</Text>{" "}
              {/* Ensure text is left-aligned */}
            </List.Item>
          </Tooltip>
        )}
      />
    </Card>
  );
};

export const getAllActions = async (
  swaggerJson: unknown
): Promise<string[]> => {
  try {
    const response = await axios.post<string[]>(
      "https://localhost:7049/api/speech/Actions",
      swaggerJson,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data || error.message;
      throw new Error(`Request failed: ${message}`);
    }
    throw new Error("An unknown error occurred.");
  }
};

const ttsFromText = async (text: string) => {
  try {
    const tokenObj = await getTokenOrRefresh();
    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
      tokenObj?.authToken,
      tokenObj?.region
    );
    speechConfig.speechSynthesisLanguage = "en-US"; // Set the language
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural"; // Set the voice

    const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
          console.log("Speech synthesis completed.");
        } else {
          console.error("Speech synthesis failed:", result.errorDetails);
        }
        synthesizer.close();
      },
      (error) => {
        console.error("Speech synthesis error:", error);
        synthesizer.close();
      }
    );
  } catch (error) {
    console.error("Error in text-to-speech:", error);
  }
};

const App: React.FC = () => {
  const { styles } = useStyle();
  const [open, setOpen] = useState<boolean>(false);
  const [items, setItems] = useState<GetProp<AttachmentsProps, "items">>([]);
  const [text, setText] = useState<string>("");
  const [recording, setRecording] = useState<boolean>(false);
  const [actions, setActions] = useState<string[]>([]); // State to store actions
  const [debugData, setDebugData] = useState<string[]>([]); // State to store debug data
  const [queryParams, setQueryParams] = useState<Record<string, string>>({}); // Move queryParams to App
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [leftSiderOpen, setLeftSiderOpen] = useState<boolean>(true);
  const [rightSiderOpen, setRightSiderOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("query");

  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const openSwaggerBackendApiPage = () => {
    window.open("https://fakerestapi.azurewebsites.net/index.html", "_blank"); // Open in a new tab
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
          setText(result.text);
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
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content !== "") {
        try {
          localStorage.setItem("swaggerJsonContent", content);
          console.log("Swagger JSON content saved to local storage");

          // Trigger getAllActions and update state
          const parsedContent = JSON.parse(content);
          const actionsList = await getAllActions(parsedContent);
          setActions(actionsList);

          onRequest({
            id: Date.now().toString(),
            content: "File uploaded successfully.", // This will be caught by our useXAgent handler
            role: "agent",
          });
        } catch (error) {
          console.error("Error processing file:", error);
          // Handle errors (e.g., invalid JSON or API failure)
        }
      }
    };
    reader.readAsText(file);
  };

  const renderMessage = (message: Message) => {
    if (message.role === "agent") {
      // Render agent's message with click handler and markdown support
      return (
        <>
          <Bubble
            key={message.id}
            content={
              <div className="markdown-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            }
            //onClick={() => handleBubbleClick(message.content)}
            style={{ cursor: "pointer" }}
          />
          <br />
        </>
      );
    } else if (message.role === "user") {
      // Render user's message with click handler
      return (
        <>
          <Bubble
            key={message.id}
            content={message.content}
            placement="end" // Align user's message to the right
          />
          <br />
        </>
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
      if (message.role === "user") {
        try {
          const swaggerJsonContent = localStorage.getItem("swaggerJsonContent");

          // Skip if no swagger JSON is available
          if (!swaggerJsonContent) {
            onSuccess({
              id: Date.now().toString(),
              content: "Please upload a Swagger JSON file first.",
              role: "agent",
            });
            return;
          }

          const swaggerJson = JSON.parse(swaggerJsonContent);

          // Prepare the request payload
          const payload = {
            text: message.content,
            swaggerJson: swaggerJson,
          };

          // Call the swaggerChat endpoint
          try {
            const response = await axios.post<ChatResponse>(
              "https://localhost:7049/api/speech/UnifiedChatbotHandler",
              payload,
              {
                headers: {
                  "Content-Type": "application/json",
                  Accept: "*/*",
                },
              }
            );

            const responseData = response.data;
            console.log("Response from swaggerChat API:", responseData);
            if (responseData.debugerResponse) {
              console.log("Debug response:", responseData.debugerResponse);
              setDebugData((prev) =>
                responseData?.debugerResponse
                  ? [...prev, responseData.debugerResponse]
                  : prev
              );
            }

            // Send the AI response back to the chat
            onSuccess({
              id: `chat-${Date.now()}`,
              content: responseData.response,
              role: "agent",
            });

            // Trigger text-to-speech for the response
            if (responseData.speachResponse) {
              ttsFromText(responseData.speachResponse);
            }
            
          } catch (error) {
            if (axios.isAxiosError(error)) {
              console.error(
                "Axios error:",
                error.response?.data || error.message
              );
            } else {
              console.error("Unexpected error:", error);
            }
            throw new Error(
              "Failed to process your request. Please try again."
            );
          }
        } catch (error) {
          console.error("Error calling swaggerChat API:", error);
          onError(
            new Error("Failed to process your request. Please try again.")
          );
        }
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
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.headerLogo}>
          <img src="ais.svg" alt="AIS Logo" />
          <text>AIS Chat</text>
        </div>
      </Header>
      <Layout style={{ marginTop: "64px" }}>
        <Layout.Sider
          collapsible
          collapsed={!leftSiderOpen}
          onCollapse={(collapsed) => setLeftSiderOpen(!collapsed)}
          width={300}
          collapsedWidth={0}
          className={styles.sider}
        >
          {actions.length > 0 && (
            <QuickActionsListComponent actions={actions} onRequest={onRequest} />
          )}
        </Layout.Sider>
        <Layout>
          <Content className={styles.chatContent}>
            <div className={styles.chat}>
              <Bubble.List
                items={[{ content: placeholderNode, variant: "borderless" }]}
              />
              <div className={styles.messages}>
                {messages.map((message) => renderMessage(message.message))}
                <div ref={messagesEndRef} />
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
          </Content>
        </Layout>
        <Layout.Sider
          collapsible
          collapsed={!rightSiderOpen}
          onCollapse={(collapsed) => setRightSiderOpen(!collapsed)}
          width={400}
          collapsedWidth={0}
          className={styles.sider}
          reverseArrow
        >
          <div className={styles.rightSider}>
            <Menu
              mode="horizontal"
              selectedKeys={[activeTab]}
              onClick={(e) => setActiveTab(e.key)}
              className={styles.menuHorizontal}
            >
              <Menu.Item key="query">Query Strings</Menu.Item>
              <Menu.Item key="debug">Debug Console</Menu.Item>
            </Menu>
            <div className={styles.tabContent}>
              {activeTab === "query" && (
                <QueryStringComponent
                  queryParams={queryParams}
                  setQueryParams={setQueryParams}
                />
              )}
              {activeTab === "debug" && (
                <DebugConsoleComponent debugData={debugData} />
              )}
            </div>
          </div>
        </Layout.Sider>
      </Layout>
    </Layout>
  );
};

export default App;
