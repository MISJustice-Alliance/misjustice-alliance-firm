import { useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { config } from '../config/env';

interface FormState {
  message: string;
  email: string;
  permissionToShare: boolean;
  attachment: File | null;
}

interface SubmitResult {
  success: boolean;
  message: string;
  confirmationSent?: boolean;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
];

export const ContactForm = () => {
  const [formState, setFormState] = useState<FormState>({
    message: '',
    email: '',
    permissionToShare: false,
    attachment: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        attachment: 'File size must be less than 10MB',
      }));
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        attachment: 'File type not allowed. Supported: PDF, images, Word documents, text files.',
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, attachment: file }));
    setErrors((prev) => ({ ...prev, attachment: '' }));
  };

  const removeAttachment = () => {
    setFormState((prev) => ({ ...prev, attachment: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formState.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    } else if (formState.message.length > MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
    }

    if (formState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const formData = new FormData();
      formData.append('message', formState.message.trim());
      formData.append('permissionToShare', String(formState.permissionToShare));

      if (formState.email) {
        formData.append('email', formState.email.trim());
      }

      if (formState.attachment) {
        formData.append('attachment', formState.attachment);
      }

      const response = await fetch(`${config.apiBaseUrl}/contact`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitResult({
          success: true,
          message: 'Your message has been sent successfully.',
          confirmationSent: data.data?.confirmationSent,
        });
        // Reset form
        setFormState({
          message: '',
          email: '',
          permissionToShare: false,
          attachment: null,
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setSubmitResult({
          success: false,
          message: data.error?.message || 'Failed to send message. Please try again.',
        });
      }
    } catch (_error) {
      setSubmitResult({
        success: false,
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = MAX_MESSAGE_LENGTH - formState.message.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
      {/* Privacy Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <ShieldExclamationIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-900 font-semibold mb-1">Privacy Recommendations</h4>
            <ul className="text-amber-800 text-sm space-y-1">
              <li>
                <strong>Do not share personal information</strong> you are not comfortable disclosing.
              </li>
              <li>
                Consider using a <strong>pseudonym</strong> in your narrative for your protection.
              </li>
              <li>
                For maximum privacy, use our <strong>Session Messenger</strong> or <strong>encrypted email</strong> options above.
              </li>
              <li>
                The email field is optional &mdash; you can submit anonymously.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success/Error Message */}
      {submitResult && (
        <div
          className={`rounded-lg p-4 mb-6 flex items-start space-x-3 ${
            submitResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {submitResult.success ? (
            <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
          ) : (
            <ExclamationCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
          )}
          <div>
            <p className={submitResult.success ? 'text-green-800' : 'text-red-800'}>
              {submitResult.message}
            </p>
            {submitResult.success && submitResult.confirmationSent && (
              <p className="text-green-700 text-sm mt-1">
                A confirmation copy has been sent to your email address.
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field (Optional) */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Email Address{' '}
            <span className="text-neutral-500 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formState.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.email ? 'border-red-500' : 'border-neutral-300'
            }`}
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
          <p className="text-neutral-500 text-xs mt-1">
            If provided, we&apos;ll send you a copy of your message for your records.
          </p>
        </div>

        {/* Message Field */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Your Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formState.message}
            onChange={handleInputChange}
            rows={8}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Describe your situation or how we can help..."
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${
              errors.message ? 'border-red-500' : 'border-neutral-300'
            }`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.message ? (
              <p className="text-red-600 text-sm">{errors.message}</p>
            ) : (
              <span />
            )}
            <p
              className={`text-sm ${
                remainingChars < 100
                  ? remainingChars < 0
                    ? 'text-red-600'
                    : 'text-amber-600'
                  : 'text-neutral-500'
              }`}
            >
              {remainingChars} characters remaining
            </p>
          </div>
        </div>

        {/* File Attachment */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Attachment{' '}
            <span className="text-neutral-500 font-normal">(optional, max 10MB)</span>
          </label>
          {formState.attachment ? (
            <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-3">
                <PaperClipIcon className="h-5 w-5 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-700">
                    {formState.attachment.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(formState.attachment.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeAttachment}
                className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <PaperClipIcon className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-600">
                Click to attach a file
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                PDF, images, Word documents, or text files
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt,.rtf"
            className="hidden"
          />
          {errors.attachment && (
            <p className="text-red-600 text-sm mt-1">{errors.attachment}</p>
          )}
        </div>

        {/* Permission Checkbox */}
        <div className="flex items-start space-x-3 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <input
            type="checkbox"
            id="permissionToShare"
            name="permissionToShare"
            checked={formState.permissionToShare}
            onChange={handleInputChange}
            className="mt-1 h-5 w-5 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="permissionToShare" className="text-sm text-neutral-700">
            <span className="font-medium">(Optional) Permission to Share:</span> I grant MISJustice
            Alliance permission to share this correspondence (with identifying information
            removed if applicable) for advocacy, documentation, or educational purposes.
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            isSubmitting
              ? 'bg-neutral-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-5 w-5" />
              <span>Send Message</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
