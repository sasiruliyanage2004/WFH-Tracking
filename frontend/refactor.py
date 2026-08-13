import re
import os

frontend_dir = r"c:\WFH Tracking\wfh-tracking-system\frontend"
src_file = os.path.join(frontend_dir, "src", "pages", "EmployeeDashboard.tsx")

with open(src_file, "r", encoding="utf-8") as f:
    content = f.read()

# We need to extract the imports, states, functions, and the return block.
# Since it's too complex to parse perfectly with regex, we can do some smart string replacements or just create the hook and components manually.

# Let's write the hook manually by extracting everything from 'function EmployeeDashboard() {' to 'return ('
hook_start_idx = content.find('function EmployeeDashboard() {')
return_idx = content.find('return (', hook_start_idx)

hook_body = content[hook_start_idx + len('function EmployeeDashboard() {'):return_idx]

hook_imports = """
import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { setBreakStart, setBreakEnd } from '../redux/store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useEmployeeDashboard() {
"""

hook_end = """
  return {
    token, user, dispatch,
    attendance, setAttendance,
    successSnackbar, setSuccessSnackbar,
    autoCheckinSnackbar, setAutoCheckinSnackbar,
    loading, setLoading,
    gpsData, setGpsData,
    gpsLoading, setGpsLoading,
    gpsError, setGpsError,
    liveHours, setLiveHours,
    breakTimeStr, setBreakTimeStr,
    productivity, setProductivity,
    mobileVerifyOpen, setMobileVerifyOpen,
    mobileVerifyToken, setMobileVerifyToken,
    otherBreakOpen, setOtherBreakOpen,
    otherBreakNote, setOtherBreakNote,
    breakAnchorEl, setBreakAnchorEl,
    breakSearch, setBreakSearch,
    idleDialogOpen, setIdleDialogOpen,
    idleMins, setIdleMins,
    webcamOpen, setWebcamOpen,
    webcamStream, setWebcamStream,
    currentTime, setCurrentTime,
    capturedPhoto, setCapturedPhoto,
    webcamError, setWebcamError,
    videoRef,
    activeTab, setActiveTab,
    tasks, setTasks,
    taskName, setTaskName,
    taskDesc, setTaskDesc,
    taskPriority, setTaskPriority,
    taskDialogOpen, setTaskDialogOpen,
    showCheckoutSuccess, setShowCheckoutSuccess,
    checkoutData, setCheckoutData,
    selectedTask, setSelectedTask,
    taskDetailsOpen, setTaskDetailsOpen,
    proofLinks, setProofLinks,
    proofFiles, setProofFiles,
    submissionComment, setSubmissionComment,
    newCommentText, setNewCommentText,
    isSubmittingProof, setIsSubmittingProof,
    isSubmittingComment, setIsSubmittingComment,
    reports, setReports,
    completedText, setCompletedText,
    progressText, setProgressText,
    challengesText, setChallengesText,
    tomorrowText, setTomorrowText,
    workedHoursInput, setWorkedHoursInput,
    fetchData,
    requestGPS, openWebcam, closeWebcam,
    handleStartBreak, handleStartOtherBreak, handleRetroactiveBreak,
    handleBreakClick, handleBreakClose, handleEndBreak,
    startMobileVerification, handleCloseMobileVerify, captureSelfie,
    handleCheckIn, handleCheckOut,
    handleCreateTask, handleTaskProgressChange, handleTaskStatusChange,
    handleOpenTaskDetails, handleAddProofLinkField, handleRemoveProofLinkField,
    handleProofLinkChange, handleProofFilesChange, handleSubmitProof, handleSubmitComment,
    handleSubmitReport
  };
}
"""

with open(os.path.join(frontend_dir, "src", "hooks", "useEmployeeDashboard.ts"), "w", encoding="utf-8") as f:
    f.write(hook_imports + hook_body + hook_end)

# This handles the hook, but we have some variable definition problems inside hook like window.api etc.
# We also need to extract components and modify the main file. Let's do it in steps.
