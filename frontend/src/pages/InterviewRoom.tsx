import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInterviewStore } from "../store";
import { useDidStreamOptimized } from "../hooks/useDidStreamOptimized";
import { useAzureSTTStreaming } from "../hooks/useAzureSTTStreaming";

type Question = {
  questionId: string;
  text: string;
  type: string;
};

type InterviewPhase = "setup" | "asking" | "listening" | "processing" | "done";

export default function InterviewRoom() {
  const navigate = useNavigate();
  const { sessionId: storeSessionId } = useInterviewStore();
  
  // D-ID Virtual Interviewer
  const {
    videoRef: didVideoRef,
    say,
    ready: didReady,
    error: didError,
    stop: stopDidStream
  } = useDidStreamOptimized();
  
  // Azure STT Speech Recognition
  const {
    start: startSTT,
    stop: stopSTT,
    listening,
    getFinalTranscript
  } = useAzureSTTStreaming();
  
  // User Camera
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const [userVideoStream, setUserVideoStream] = useState<MediaStream | null>(null);
  
  // Interview State
  const [sessionId, setSessionId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [questionCount, setQuestionCount] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [started, setStarted] = useState<boolean>(false);

  // FIX: Ref to track if it's the first question to add a delay
  const isFirstQuestion = useRef(true);

  // Initialize interview session and user camera
  useEffect(() => {
    const initialize = async () => {
      try {
        // Use session ID passed from store, if not available redirect back to config page
        if (!storeSessionId) {
          console.error("No session ID found, redirecting to mock config");
          navigate('/mock');
          return;
        }
        
        setSessionId(storeSessionId);
        console.log("Using existing interview session:", storeSessionId);
        
        // Set up user camera preview
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false // Audio is handled separately by STT hook
        });
        setUserVideoStream(stream);
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          userVideoRef.current.play().catch(console.warn);
        }
        
        // Initialization complete, waiting for user to click Start
        
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    initialize();
    
    // Cleanup function
    return () => {
      if (userVideoStream) {
        userVideoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [storeSessionId, navigate]);

  // Monitor D-ID connection status and started flag, begin interview
  useEffect(() => {
    if (didReady && started && sessionId && !currentQuestion && phase === "setup") {
      loadNextQuestion(sessionId);
    }
  }, [didReady, started, sessionId, currentQuestion, phase]); // Added dependencies for safety



  const loadNextQuestion = async (sessionId: string) => {
    try {
      const resp = await fetch(`/api/video-session/${sessionId}/next`);
      const question = await resp.json();
      
      if (question.text === "__DONE__") {
        setPhase("done");
        await generateFinalReport(sessionId);
        return;
      }
      
      setCurrentQuestion(question);
      setQuestionCount(prev => prev + 1);
      setPhase("asking");

      console.log("Loading question:", question.text);
      
      // FIX: If this is the first question, add a one-time delay
      // This gives D-ID's backend services a moment to initialize after connection.
      if (isFirstQuestion.current) {
        console.log("First question, pausing for 1 second before speaking...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        isFirstQuestion.current = false;
      }
      
      // Virtual interviewer reads the question
      await say(question.text);
      
      // Brief delay before starting to listen for user answer
      // After the interviewer finishes speaking, instead of waiting for user click, 
      // we provide a natural conversation pause, then automatically start listening.
      console.log("Interviewer finished speaking. Pausing for a natural gap before listening...");
      setTimeout(() => {
        // Automatically transition to listening phase
        beginListening();
      }, 1500); // 1500ms (1.5 seconds) simulates natural thinking and reaction time in real conversation
      
    } catch (err) {
      console.error("Failed to load next question:", err);
    }
  };

  const beginListening = async () => {
    try {
      if (phase === 'listening') return; // Prevent duplicate calls
      
      setPhase("listening");
      
              // Pass finishAnswer as callback function to startSTT
        await startSTT(finishAnswer); // Core modification
      
      console.log("Started listening for user answer (with auto-finish).");
    } catch (err) {
      console.error("Failed to start listening:", err);
    }
  };

  const finishAnswer = async () => {
    if (phase !== 'listening') {
      return;
    }
    
    try {
      setPhase("processing");
      console.log("Phase changed to 'processing'. Finalizing the answer.");
      
              // Stop speech recognition
        await stopSTT();
        
        // Get complete transcript
        const finalTranscript = getFinalTranscript();
      
      console.log("Final transcript:", finalTranscript);
      
      // 5. Handle Empty Transcript: If the user was silent, don't save anything and just move on.
      if (!finalTranscript || finalTranscript.trim() === "") {
        console.log("Empty transcript detected. Moving to the next question without saving.");
        
        // Move to the next question after a short delay
        setTimeout(() => {
          // Use storeSessionId directly, assuming you've removed the local state
          if (storeSessionId) loadNextQuestion(storeSessionId);
        }, 1500); 
        
        return; // End the function here
      }
      
      // 6. UI no longer displays transcript text

      // 7. Submit to Backend: Send the question ID and the user's answer to your API.
      let evaluationData: any = null;
      if (currentQuestion && storeSessionId) {
        console.log("Submitting answer to the backend...");
        try {
          const response = await fetch(`/api/session/${storeSessionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: storeSessionId,
              orderNo: currentQuestion.questionId,
              answerText: finalTranscript
            })
          });

          if (response.ok) {
            const result = await response.json();
            evaluationData = result.evaluationJson ? JSON.parse(result.evaluationJson) : null;
            console.log("Answer evaluation received:", evaluationData);

            // Save evaluation data (not displayed immediately, shown uniformly in report)
            if (evaluationData && currentQuestion) {
              // setQuestionEvaluations(prev => ({ // This line was removed
              //   ...prev,
              //   [currentQuestion.questionId]: {
              //     ...evaluationData,
              //     questionText: currentQuestion.text,
              //     questionType: currentQuestion.type
              //   }
              // }));
              console.log("Evaluation saved for question:", currentQuestion.questionId);
            }
          } else {
            console.error("Failed to submit answer:", response.status);
          }
        } catch (error) {
          console.error("Error submitting answer:", error);
        }
      }
      
      // 8. Load Next Question: After a brief pause for the user to see their final transcript, load the next question.
      setTimeout(() => {
        if (storeSessionId) loadNextQuestion(storeSessionId);
      }, 2000); // 2-second delay
      
    } catch (err) {
      console.error("Failed to finish answer:", err);
    }
  };

  const generateFinalReport = async (sessionId: string) => {
    try {
      // Generate final report including evaluation information
      const resp = await fetch(`/api/session/${sessionId}/report`, {
        method: "POST"
      });

      if (!resp.ok) {
        throw new Error(`Failed to generate report: ${resp.status}`);
      }

      const reportData = await resp.json();

      // Directly use report data returned from backend
      setReport(reportData.reportJson);
      console.log("Generated final report:", reportData.reportJson);

    } catch (err) {
      console.error("Failed to generate report:", err);
      // If report generation fails, display error message
      setReport({
        Overall: "0",
        Verdict: "Error",
        QuestionEvaluations: [],
        error: "Report generation failed"
      });
    }
  };

  const restartInterview = () => {
    // A full reload is a simple way to reset all state
    window.location.reload();
  };

  const finishInterview = async () => {
    try {
      console.log("Finishing interview...");

      // 1. Stop speech recognition
      if (listening) {
        await stopSTT();
      }

      // 2. Stop and delete D-ID stream
      await stopDidStream();

      // 3. Clean up user camera
      if (userVideoStream) {
        userVideoStream.getTracks().forEach(track => track.stop());
        setUserVideoStream(null);
      }

      // 4. Reset all state
      setPhase("setup");
      setCurrentQuestion(null);
      setQuestionCount(0);
      setReport(null);
      setStarted(false);
      isFirstQuestion.current = true;

      // 5. Navigate to report page
      if (storeSessionId) {
        navigate(`/report/${storeSessionId}`);
      } else {
        // If no sessionId, return to config page
        navigate('/mock');
      }

    } catch (error) {
      console.error("Error finishing interview:", error);
      // Even if there's an error, try to navigate to report page
      if (storeSessionId) {
        navigate(`/report/${storeSessionId}`);
      } else {
        navigate('/mock');
      }
    }
  };

  const goHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Title and Status */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              AI Video Interview Room
            </h1>
            {/* Finish Button */}
            <button
              onClick={finishInterview}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              title="Finish interview and view report"
            >
              Finish
            </button>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className={`px-3 py-1 rounded-full ${
              phase === "setup" ? "bg-yellow-100 text-yellow-800" :
              phase === "asking" ? "bg-blue-100 text-blue-800" :
              phase === "listening" ? "bg-green-100 text-green-800" :
              phase === "processing" ? "bg-orange-100 text-orange-800" :
              "bg-purple-100 text-purple-800"
            }`}>
              Phase: {phase}
            </span>
            <span className="text-gray-600">Question: {questionCount}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              didReady ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              D-ID: {didReady ? "Connected" : "Connecting..."}
            </span>
            {listening && (
              <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs animate-pulse">
                🎤 Recording
              </span>
            )}
          </div>
        </div>

        {phase !== "done" && (
          <>
            {/* Video Area */}
            <div className="relative bg-white rounded-lg shadow-md p-4 mb-6">
              {/* Main Video: D-ID Virtual Interviewer */}
              <div className="relative">
                  <h3 className="font-semibold mb-3 text-gray-900">AI Interviewer</h3>
                  <video
                      ref={didVideoRef}
                      playsInline
                      autoPlay
                      muted={false}
                      className="w-full h-[500px] rounded-lg bg-gray-100 object-cover transition-all duration-300"
                  />
                  {/* Start Overlay Button */}
                  {didReady && !started && phase === "setup" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                      onClick={() => setStarted(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-medium"
                      >
                      Start
                      </button>
                    </div>
                  )}
                  {!didReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Connecting to interviewer...</p>
                      </div>
                    </div>
                  )}
                  {didError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600 text-center px-4">
                        Connection Error: {didError}
                      </p>
                    </div>
                  )}
                </div>
              

              {/* User Camera Preview */}
              <div className="absolute bottom-6 right-6 w-1/4 max-w-[200px] bg-white p-2 rounded-lg shadow-xl border border-gray-200">
                <h3 className="font-semibold text-sm mb-2 text-gray-800 text-center">Your Camera</h3>
                <video
                    ref={userVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full rounded bg-gray-100 object-cover"
                />
              </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Current Question
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentQuestion.type === "technical" ? "bg-blue-100 text-blue-800" :
                    currentQuestion.type === "behavioral" ? "bg-green-100 text-green-800" :
                    "bg-purple-100 text-purple-800"
                  }`}>
                    {currentQuestion.type}
                  </span>
                </div>
                <p className="text-gray-800 text-lg leading-relaxed">
                  {currentQuestion.text}
                </p>
              </div>
            )}





            {/* Control Buttons */}
            <div className="flex justify-center space-x-4 h-12 items-center">
            {phase === "listening" ? (
                <p className="text-gray-600 italic animate-pulse">
                I'm listening... finish speaking and I will process your answer.
                </p>
            ) : phase === "asking" ? (
                <p className="text-gray-600 italic">
                Listen to the question...
                </p>
            ) : (
                <div className="text-gray-600">
                {phase === "setup" && "Setting up interview..."}
                {phase === "processing" && "Processing your answer..."}
                </div>
            )}
            </div>
          </>
        )}

                  {/* Interview Complete - Display Report */}
        {phase === "done" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Interview Complete! 🎉
            </h2>
            
            {report ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {report.overallScore || "N/A"}
                  </div>
                  <div className="text-gray-600">Overall Score</div>
                </div>
                
                {report.dimensions && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.dimensions.map((dim: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{dim.name}</h4>
                          <span className="font-bold text-blue-600">{dim.score}/10</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{dim.advice}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {report.keyStrengths && (
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">Key Strengths:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {report.keyStrengths.map((strength: string, index: number) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {report.improvements && (
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-2">Areas for Improvement:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {report.improvements.map((improvement: string, index: number) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Question Detailed Evaluation */}
                {report.questionEvaluations && report.questionEvaluations.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Detailed Question Feedback</h3>
                    <div className="space-y-6">
                      {report.questionEvaluations.map((evaluation: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  evaluation.questionType === 'technical'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {evaluation.questionType}
                                </span>
                                <span className="text-sm text-gray-600">Question {index + 1}</span>
                              </div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {evaluation.questionText}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <div className="w-16 h-2 bg-gray-200 rounded">
                                <div
                                  className="h-2 bg-blue-600 rounded"
                                  style={{ width: `${(evaluation.score / 10) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-lg font-bold text-blue-600">
                                {evaluation.score}/10
                              </span>
                            </div>
                          </div>

                          {/* Feedback Content */}
                          <div className="space-y-4">
                            {evaluation.feedback && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">AI Feedback:</h5>
                                <p className="text-gray-800 bg-white p-3 rounded border">
                                  {evaluation.feedback}
                                </p>
                              </div>
                            )}

                            {evaluation.strengths && evaluation.strengths.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-green-700 mb-2">Strengths:</h5>
                                <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                                  {evaluation.strengths.map((strength: string, idx: number) => (
                                    <li key={idx}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-orange-700 mb-2">Areas for Improvement:</h5>
                                <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                                  {evaluation.weaknesses.map((weakness: string, idx: number) => (
                                    <li key={idx}>{weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-blue-700 mb-2">Suggestions:</h5>
                                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                                  {evaluation.suggestions.map((suggestion: string, idx: number) => (
                                    <li key={idx}>{suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Message Display */}
                {report.error && (
                  <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          <strong>Report Generation Error:</strong> {report.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating your interview report...</p>
              </div>
            )}
            
            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={restartInterview}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Interview
              </button>
              <button
                onClick={finishInterview}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Finish & Exit
              </button>
              <button
                onClick={goHome}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
