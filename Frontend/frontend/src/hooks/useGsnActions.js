import { useState } from 'react';
import * as api from '../api';
import { GSN_REPORT_MAX_COMMENT } from '../components/chat/gsn/gsnProtocol';

/**
 * Interaction state for the GSN surface: comment threads, post actions and the
 * abuse-report dialog. Extracted from GsnPane so the pane composition stays
 * readable; behaviour is unchanged and every action still targets real posts.
 */
export default function useGsnActions({
  activeIdentity,
  addComment,
  deletePost,
  deleteComment,
  fetchComments,
  showConfirm,
  triggerAlert,
  t
}) {
  const [expandedComments, setExpandedComments] = useState({});
  const [commentTextMap, setCommentTextMap] = useState({});
  const [repostOfPostId, setRepostOfPostId] = useState('');
  const [reportModalTarget, setReportModalTarget] = useState(null);
  const [reportCategory, setReportCategory] = useState('spam');
  const [reportSeverity, setReportSeverity] = useState('low');
  const [reportComment, setReportComment] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const toggleComments = postId => {
    const isExpanded = !expandedComments[postId];
    setExpandedComments(previous => ({ ...previous, [postId]: isExpanded }));
    if (isExpanded) {
      fetchComments(postId);
    }
  };

  const handleAddComment = async postId => {
    const text = commentTextMap[postId] || '';
    if (!text.trim()) return;
    try {
      await addComment(postId, text);
      setCommentTextMap(previous => ({ ...previous, [postId]: '' }));
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    }
  };

  const handleDeletePost = postId => {
    showConfirm(
      t('gsn_delete_confirm_title') || 'Beitrag löschen?',
      t('gsn_delete_confirm_desc') || 'Bist du sicher, dass du diesen Beitrag unwiderruflich löschen möchtest?',
      async () => {
        try {
          await deletePost(postId);
        } catch (err) {
          triggerAlert(t('error') || 'Fehler', err.message, 'danger');
        }
      }
    );
  };

  const handleDeleteComment = (postId, commentId) => {
    showConfirm(
      t('gsn_delete_comment_confirm_title') || 'Kommentar löschen?',
      t('gsn_delete_comment_confirm_desc') || 'Bist du sicher, dass du diesen Kommentar unwiderruflich löschen möchtest?',
      async () => {
        try {
          await deleteComment(postId, commentId);
        } catch (err) {
          triggerAlert(t('error') || 'Fehler', err.message, 'danger');
        }
      }
    );
  };

  const handleRepost = post => {
    setRepostOfPostId(post.id);
    const composer = document.getElementById('gsn-composer-input');
    if (composer) {
      composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      composer.focus({ preventScroll: true });
    }
  };

  const handleOpenReportModal = (type, id) => {
    setReportModalTarget({ type, id });
    setReportCategory('spam');
    setReportSeverity('low');
    setReportComment('');
  };

  const handleSubmitReport = async () => {
    if (!reportModalTarget || !activeIdentity) return;
    const trimmedComment = reportComment.trim();
    if (trimmedComment.length > GSN_REPORT_MAX_COMMENT) {
      triggerAlert('Meldung zu lang', `Maximal ${GSN_REPORT_MAX_COMMENT} Zeichen.`);
      return;
    }
    setSubmittingReport(true);
    try {
      await api.submitAbuseReport(
        activeIdentity.ID,
        reportModalTarget.type,
        reportModalTarget.id,
        reportCategory,
        reportSeverity,
        null,
        trimmedComment
      );
      triggerAlert(t('success') || 'Erfolg', t('gsn_report_submitted') || 'Meldung wurde an die Governance übermittelt.');
      setReportModalTarget(null);
    } catch (err) {
      triggerAlert(t('error') || 'Fehler', err.message, 'danger');
    } finally {
      setSubmittingReport(false);
    }
  };

  return {
    expandedComments,
    commentTextMap,
    setCommentTextMap,
    toggleComments,
    handleAddComment,
    handleDeletePost,
    handleDeleteComment,
    repostOfPostId,
    setRepostOfPostId,
    handleRepost,
    reportModalTarget,
    setReportModalTarget,
    reportCategory,
    setReportCategory,
    reportSeverity,
    setReportSeverity,
    reportComment,
    setReportComment,
    submittingReport,
    handleOpenReportModal,
    handleSubmitReport
  };
}
