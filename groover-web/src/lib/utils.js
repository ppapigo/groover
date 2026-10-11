// src/lib/utils.ts
export function formatNumber(num) {
    return num.toLocaleString('ko-KR');
}
export function formatCurrency(amount) {
    return `₩${amount.toLocaleString('ko-KR')}`;
}
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}
export function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1)
        return '방금 전';
    if (diffMins < 60)
        return `${diffMins}분 전`;
    if (diffHours < 24)
        return `${diffHours}시간 전`;
    if (diffDays < 7)
        return `${diffDays}일 전`;
    return formatDate(dateStr);
}
export function formatDealStatus(status) {
    const statusMap = {
        PROPOSED: '제안됨',
        ACCEPTED: '수락됨',
        REJECTED: '거절됨',
        PAID: '결제완료',
        SUBMITTED: '제출완료',
        CONFIRMED: '승인완료',
        SETTLED: '정산완료',
        CANCELLED: '취소됨',
        REFUNDED: '환불됨',
    };
    return statusMap[status] || status;
}
export function getStatusColor(status) {
    const colorMap = {
        PROPOSED: 'bg-yellow-100 text-yellow-800',
        ACCEPTED: 'bg-blue-100 text-blue-800',
        REJECTED: 'bg-red-100 text-red-800',
        PAID: 'bg-purple-100 text-purple-800',
        SUBMITTED: 'bg-indigo-100 text-indigo-800',
        CONFIRMED: 'bg-green-100 text-green-800',
        SETTLED: 'bg-green-100 text-green-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
        REFUNDED: 'bg-orange-100 text-orange-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
}
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
