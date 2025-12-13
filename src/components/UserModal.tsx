import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserModal({ isOpen, onClose }: UserModalProps) {
  const { currentUser, logout, updatePassword } = useAuth();
  const { displayName, updateDisplayName } = useUserProfile();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setNewName(displayName || '');
  }, [displayName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setNameError('用户名不能为空');
      return;
    }
    if (newName.length < 2 || newName.length > 20) {
      setNameError('用户名长度需在2-20个字符之间');
      return;
    }
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(newName)) {
      setNameError('用户名只能包含字母、数字、中文、下划线和短横线');
      return;
    }

    setNameLoading(true);
    setNameError('');

    try {
      const success = await updateDisplayName(newName);
      if (success) {
        setIsEditingName(false);
      } else {
        setNameError('更新失败，请重试');
      }
    } catch {
      setNameError('更新失败，请重试');
    } finally {
      setNameLoading(false);
    }
  };

  const handleCancelName = () => {
    setNewName(displayName || '');
    setIsEditingName(false);
    setNameError('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('请填写完整密码信息');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('密码至少需要6位字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    setPasswordLoading(true);

    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      alert('✅ 密码修改成功！');
    } catch (error) {
      setPasswordError((error as Error).message || '修改密码失败，请重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelChangePassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowChangePassword(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4 select-none">
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          >
            {currentUser ? (
              <div className="p-5 space-y-4">
                {/* 用户头像和信息 */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <i className="fa-solid fa-cat text-white text-xl"></i>
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm bg-white`}
                    >
                      <i
                        className={`fa-solid ${
                          currentUser.email_confirmed_at
                            ? 'fa-envelope-circle-check text-emerald-500'
                            : 'fa-envelope-open text-amber-500'
                        } text-xs flex items-center justify-center w-full h-full`}
                      ></i>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditingName ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full px-2 py-1 text-sm font-semibold border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="请输入用户名"
                          maxLength={20}
                          disabled={nameLoading}
                          autoFocus
                        />
                        {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveName}
                            disabled={nameLoading || !newName.trim()}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white px-2 py-1 rounded"
                          >
                            {nameLoading ? '保存中...' : '保存'}
                          </button>
                          <button
                            onClick={handleCancelName}
                            disabled={nameLoading}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-left hover:bg-blue-50/50 rounded-lg p-1 transition-colors duration-200 group w-full"
                      >
                        <div className="text-base font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200 truncate">
                          {displayName || '用户'}
                          <i className="fa-solid fa-edit text-xs text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all duration-200 ml-2"></i>
                        </div>
                      </button>
                    )}

                    <div className="text-xs text-gray-500 truncate mt-1">{currentUser.email}</div>

                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        currentUser.email_confirmed_at
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          currentUser.email_confirmed_at ? 'fa-shield-check' : 'fa-envelope'
                        } text-xs`}
                      ></i>
                      <span>{currentUser.email_confirmed_at ? '已验证' : '待验证'}</span>
                    </div>
                  </div>
                </div>

                {/* 分割线 */}
                <div className="border-t border-gray-200"></div>

                {/* 操作按钮 */}
                <div className="space-y-2">
                  {/* 修改密码 */}
                  {!showChangePassword ? (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <i className="fa-solid fa-key text-gray-500 w-5"></i>
                      <span>修改密码</span>
                    </button>
                  ) : (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">修改密码</span>
                        <button
                          onClick={handleCancelChangePassword}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </div>

                      {passwordError && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                          {passwordError}
                        </div>
                      )}

                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="新密码（至少6位）"
                        disabled={passwordLoading}
                      />

                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="确认新密码"
                        disabled={passwordLoading}
                      />

                      <button
                        onClick={handleChangePassword}
                        disabled={passwordLoading || !newPassword || !confirmPassword}
                        className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                      >
                        {passwordLoading ? '修改中...' : '确认修改'}
                      </button>
                    </div>
                  )}

                  {/* 退出登录 */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket w-5"></i>
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-cat text-white text-lg"></i>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-800">账号登录</div>
                    <div className="text-xs text-gray-500">登录后可同步数据到云端</div>
                  </div>
                </div>

                <AuthForm onSuccess={onClose} />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
