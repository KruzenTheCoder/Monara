import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBox } from '../components/GlassBox';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { theme, formatCurrencyFull } from '../utils/theme';
import { useFinancial } from '../context/FinancialContext';
import {
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  Calendar,
  PieChart,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  insights?: Insight[];
  suggestions?: Suggestion[];
}

interface Insight {
  type: 'warning' | 'success' | 'info' | 'tip';
  title: string;
  description: string;
  icon: any;
  color: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface Suggestion {
  id: string;
  text: string;
  icon: any;
}

export const AIAssistantScreen = () => {
  const {
    transactions,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    monthlySpendingByCategory,
    budgets,
    user,
    savingsGoals,
    upcomingBills,
  } = useFinancial();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingDot1 = useRef(new Animated.Value(0.4)).current;
  const typingDot2 = useRef(new Animated.Value(0.4)).current;
  const typingDot3 = useRef(new Animated.Value(0.4)).current;
  const currency = user.currency || 'USD';

  // Typing dots animation
  useEffect(() => {
    if (!isTyping) return;

    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        ])
      );

    const anims = [
      createDotAnimation(typingDot1, 0),
      createDotAnimation(typingDot2, 150),
      createDotAnimation(typingDot3, 300),
    ];
    anims.forEach(a => a.start());

    return () => anims.forEach(a => a.stop());
  }, [isTyping]);

  useEffect(() => {
    // Welcome message
    const welcomeMessage: Message = {
      id: '0',
      type: 'assistant',
      content: `Hi ${user.display_name || 'there'}! 👋 I'm your AI financial assistant. I can help you understand your spending, plan your budget, and achieve your financial goals. What would you like to know?`,
      timestamp: new Date(),
      suggestions: [
        { id: '1', text: 'How much did I spend this month?', icon: DollarSign },
        { id: '2', text: 'Where can I save money?', icon: Target },
        { id: '3', text: 'Am I on track with my budget?', icon: TrendingUp },
        { id: '4', text: 'Show my spending trends', icon: PieChart },
      ],
    };
    setMessages([welcomeMessage]);
  }, []);

  const analyzeQuery = (query: string): Message => {
    const lowerQuery = query.toLowerCase();
    let response: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      insights: [],
      suggestions: [],
    };

    // Spending this month
    if (lowerQuery.includes('spend') && (lowerQuery.includes('month') || lowerQuery.includes('this'))) {
      const topCategories = Object.entries(monthlySpendingByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      response.content = `You've spent ${formatCurrencyFull(monthlyExpenses, currency)} this month. Here's the breakdown:`;
      
      topCategories.forEach(([category, amount]) => {
        const percentage = monthlyExpenses > 0 ? ((amount / monthlyExpenses) * 100).toFixed(0) : '0';
        response.content += `\n• ${category}: ${formatCurrencyFull(amount, currency)} (${percentage}%)`;
      });

      // Add insights
      if (monthlyExpenses > monthlyIncome && monthlyIncome > 0) {
        response.insights?.push({
          type: 'warning',
          title: 'Spending Alert',
          description: `You're spending ${formatCurrencyFull(monthlyExpenses - monthlyIncome, currency)} more than you earn this month.`,
          icon: AlertTriangle,
          color: theme.colors.status.red,
        });
      } else if (savingsRate >= 20) {
        response.insights?.push({
          type: 'success',
          title: 'Great Job!',
          description: `You're saving ${savingsRate.toFixed(0)}% of your income. Keep it up!`,
          icon: TrendingUp,
          color: theme.colors.status.green,
        });
      }
    }
    // Top spending category
    else if (lowerQuery.includes('top') || lowerQuery.includes('most')) {
      const topCategory = Object.entries(monthlySpendingByCategory)
        .sort((a, b) => b[1] - a[1])[0];

      if (topCategory) {
        const [category, amount] = topCategory;
        const percentage = monthlyExpenses > 0 ? ((amount / monthlyExpenses) * 100).toFixed(0) : '0';
        
        response.content = `Your top spending category is ${category} at ${formatCurrencyFull(amount, currency)}, which is ${percentage}% of your total spending this month.`;

        const budget = budgets.find(b => b.category === category);
        if (budget && amount > budget.monthly_limit) {
          response.insights?.push({
            type: 'warning',
            title: 'Budget Exceeded',
            description: `You've exceeded your ${category} budget by ${formatCurrencyFull(amount - budget.monthly_limit, currency)}.`,
            icon: AlertTriangle,
            color: theme.colors.status.amber,
          });
        }
      } else {
        response.content = "You haven't logged any expenses this month yet.";
      }
    }
    // Saving opportunities
    else if (lowerQuery.includes('save') && (lowerQuery.includes('money') || lowerQuery.includes('where') || lowerQuery.includes('how'))) {
      const insights: Insight[] = [];
      
      const overdueBills = upcomingBills.filter(b => b.isOverdue);
      const dueSoonBills = upcomingBills.filter(b => !b.isPaid && differenceInDays(b.nextDue, new Date()) <= 3 && differenceInDays(b.nextDue, new Date()) >= 0);

      if (overdueBills.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Overdue Bills',
          description: `You have ${overdueBills.length} bill${overdueBills.length > 1 ? 's' : ''} overdue. Mark them paid or review your cash flow.`,
          icon: AlertTriangle,
          color: theme.colors.status.red,
        });
      } else if (dueSoonBills.length > 0) {
        insights.push({
          type: 'tip',
          title: 'Bills Due Soon',
          description: `${dueSoonBills.length} bill${dueSoonBills.length > 1 ? 's are' : ' is'} due in the next 3 days. Staying ahead avoids late fees.`,
          icon: Zap,
          color: '#F59E0B',
        });
      }

      // Check overspending categories
      budgets.forEach(budget => {
        const spent = monthlySpendingByCategory[budget.category] || 0;
        if (spent > budget.monthly_limit * 0.9) {
          insights.push({
            type: 'warning',
            title: `${budget.category} Alert`,
            description: `You're at ${((spent / budget.monthly_limit) * 100).toFixed(0)}% of your budget. Consider cutting back.`,
            icon: AlertTriangle,
            color: theme.colors.status.amber,
          });
        }
      });

      // General savings tips
      if (savingsRate < 20) {
        insights.push({
          type: 'tip',
          title: 'Increase Savings Rate',
          description: `Aim to save at least 20% of your income. You're currently at ${savingsRate.toFixed(0)}%. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`,
          icon: Target,
          color: theme.colors.accent,
        });
      }

      response.content = insights.length > 0 
        ? "I've found several opportunities to save money:"
        : "You're doing great! Your spending is well-controlled. Keep up the good work!";
      
      response.insights = insights;
    }
    // Budget tracking
    else if (lowerQuery.includes('budget') || lowerQuery.includes('track')) {
      const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
      const budgetUsedPct = totalBudget > 0 ? ((monthlyExpenses / totalBudget) * 100).toFixed(0) : '0';

      response.content = `You've used ${budgetUsedPct}% of your total budget (${formatCurrencyFull(monthlyExpenses, currency)} of ${formatCurrencyFull(totalBudget, currency)}).`;

      budgets.forEach(budget => {
        const spent = monthlySpendingByCategory[budget.category] || 0;
        const pct = budget.monthly_limit > 0 ? ((spent / budget.monthly_limit) * 100).toFixed(0) : '0';
        
        if (spent > budget.monthly_limit) {
          response.insights?.push({
            type: 'warning',
            title: `${budget.category} Over Budget`,
            description: `${pct}% used (${formatCurrencyFull(spent - budget.monthly_limit, currency)} over)`,
            icon: AlertTriangle,
            color: theme.colors.status.red,
          });
        } else if (spent / budget.monthly_limit >= 0.9) {
          response.insights?.push({
            type: 'warning',
            title: `${budget.category} Almost Full`,
            description: `${pct}% used (${formatCurrencyFull(budget.monthly_limit - spent, currency)} left)`,
            icon: AlertTriangle,
            color: theme.colors.status.amber,
          });
        }
      });
    }
    // Spending trends
    else if (lowerQuery.includes('trend') || lowerQuery.includes('pattern') || lowerQuery.includes('habit')) {
      const last30Days = transactions.filter(t => 
        t.type === 'expense' &&
        new Date(t.date) >= subDays(new Date(), 30)
      );
      
      const dailyAverage = last30Days.length > 0 
        ? last30Days.reduce((sum, t) => sum + t.amount, 0) / 30 
        : 0;

      // Find peak spending day
      const spendingByDay: { [key: string]: number } = {};
      last30Days.forEach(t => {
        const day = format(new Date(t.date), 'EEEE');
        spendingByDay[day] = (spendingByDay[day] || 0) + t.amount;
      });
      
      const peakDay = Object.entries(spendingByDay)
        .sort((a, b) => b[1] - a[1])[0];

      response.content = `Your average daily spending is ${formatCurrencyFull(dailyAverage, currency)}.`;
      
      if (peakDay) {
        response.content += ` You spend the most on ${peakDay[0]}s.`;
        
        response.insights?.push({
          type: 'info',
          title: 'Spending Pattern',
          description: `${peakDay[0]} is your highest spending day with ${formatCurrencyFull(peakDay[1], currency)} total in the last 30 days.`,
          icon: Calendar,
          color: '#3B82F6',
        });
      }

      // Compare to last month
      const thisMonth = transactions.filter(t => 
        t.type === 'expense' &&
        new Date(t.date) >= startOfMonth(new Date())
      );
      const lastMonthStart = startOfMonth(subDays(startOfMonth(new Date()), 1));
      const lastMonth = transactions.filter(t => 
        t.type === 'expense' &&
        new Date(t.date) >= lastMonthStart &&
        new Date(t.date) < startOfMonth(new Date())
      );
      
      const thisMonthTotal = thisMonth.reduce((sum, t) => sum + t.amount, 0);
      const lastMonthTotal = lastMonth.reduce((sum, t) => sum + t.amount, 0);
      
      if (lastMonthTotal > 0) {
        const change = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
        const changeType = change > 0 ? 'increased' : 'decreased';
        
        response.insights?.push({
          type: change > 10 ? 'warning' : change < -10 ? 'success' : 'info',
          title: 'Month-over-Month',
          description: `Spending ${changeType} by ${Math.abs(change).toFixed(0)}% compared to last month.`,
          icon: change > 0 ? TrendingUp : TrendingDown,
          color: change > 0 ? theme.colors.status.red : theme.colors.status.green,
        });
      }
    }
    // Income tracking
    else if (lowerQuery.includes('income') || lowerQuery.includes('earn')) {
      response.content = `Your income this month is ${formatCurrencyFull(monthlyIncome, currency)}.`;
      
      const netSavings = monthlyIncome - monthlyExpenses;
      response.content += ` After expenses, you have ${formatCurrencyFull(netSavings, currency)} left (${savingsRate.toFixed(0)}% savings rate).`;

      if (savingsRate >= 20) {
        response.insights?.push({
          type: 'success',
          title: 'Excellent Savings!',
          description: 'You\'re saving at a healthy rate. Consider increasing contributions to your savings goals.',
          icon: Target,
          color: theme.colors.status.green,
        });
      } else if (savingsRate >= 10) {
        response.insights?.push({
          type: 'info',
          title: 'Good Progress',
          description: 'Try to increase your savings rate to 20% or more for long-term financial health.',
          icon: Lightbulb,
          color: '#3B82F6',
        });
      } else {
        response.insights?.push({
          type: 'warning',
          title: 'Low Savings Rate',
          description: 'Aim to save at least 10-20% of your income. Review your expenses to find areas to cut.',
          icon: AlertTriangle,
          color: theme.colors.status.amber,
        });
      }
    }
    // Goals tracking
    else if (lowerQuery.includes('goal')) {
      if (savingsGoals.length === 0) {
        response.content = "You don't have any savings goals yet. Setting goals can help you stay motivated!";
        response.insights?.push({
          type: 'tip',
          title: 'Create a Savings Goal',
          description: 'Start with a small goal like an emergency fund ($1,000) or a vacation fund.',
          icon: Target,
          color: theme.colors.accent,
        });
      } else {
        response.content = `You have ${savingsGoals.length} active savings goal${savingsGoals.length > 1 ? 's' : ''}:`;
        
        savingsGoals.forEach(goal => {
          const progress = goal.target_amount > 0 
            ? ((goal.current_amount / goal.target_amount) * 100).toFixed(0) 
            : '0';
          const remaining = goal.target_amount - goal.current_amount;
          
          response.content += `\n• ${goal.name}: ${progress}% complete (${formatCurrencyFull(remaining, currency)} to go)`;

          if (goal.target_date) {
            const daysLeft = differenceInDays(new Date(goal.target_date), new Date());
            const monthlyNeeded = daysLeft > 0 ? remaining / (daysLeft / 30) : 0;
            
            if (daysLeft < 30 && Number(progress) < 90) {
              response.insights?.push({
                type: 'warning',
                title: `${goal.name} Deadline`,
                description: `Only ${daysLeft} days left! You need to save ${formatCurrencyFull(monthlyNeeded, currency)}/month to reach your goal.`,
                icon: Calendar,
                color: theme.colors.status.amber,
              });
            }
          }
        });
      }
    }
    // Default fallback
    else {
      response.content = "I can help you with questions about:\n\n• Your spending this month\n• Budget tracking\n• Savings opportunities\n• Spending patterns\n• Income and savings rate\n• Your financial goals\n\nWhat would you like to know?";
      response.suggestions = [
        { id: '1', text: 'Show my spending breakdown', icon: PieChart },
        { id: '2', text: 'Where am I overspending?', icon: AlertTriangle },
        { id: '3', text: 'How can I save more?', icon: Target },
        { id: '4', text: 'What are my spending patterns?', icon: TrendingUp },
      ];
    }

    return response;
  };

  const handleSend = (overrideText?: string) => {
    const textToSend = overrideText ?? inputText;
    if (!textToSend.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const aiResponse = analyzeQuery(textToSend);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1000);
  };

  const handleSuggestionPress = (suggestion: Suggestion) => {
    handleSend(suggestion.text);
  };

  const InsightCard = ({ insight }: { insight: Insight }) => (
    <View style={[styles.insightCard, { borderLeftColor: insight.color }]}>
      <View style={[styles.insightIcon, { backgroundColor: `${insight.color}20` }]}>
        <insight.icon color={insight.color} size={20} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightDescription}>{insight.description}</Text>
        {insight.action && (
          <TouchableOpacity 
            style={styles.insightAction}
            onPress={insight.action.onPress}
          >
            <Text style={[styles.insightActionText, { color: insight.color }]}>
              {insight.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.type === 'user';

    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <LinearGradient
              colors={[theme.colors.accent, '#1B2A4A']}
              style={styles.avatarGradient}
            >
              <Sparkles color={theme.colors.primaryText} size={16} />
            </LinearGradient>
          </View>
        )}
        
        <View style={[styles.messageContent, isUser && { alignItems: 'flex-end' as const }]}>
          <View style={[
            styles.bubble,
            isUser ? styles.userBubbleContent : styles.assistantBubbleContent
          ]}>
            <Text style={[styles.messageText, isUser && { color: theme.colors.primaryText }]}>
              {message.content}
            </Text>
          </View>
          
          {message.insights && message.insights.length > 0 && (
            <View style={styles.insightsContainer}>
              {message.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </View>
          )}
          
          {message.suggestions && message.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {message.suggestions.map(suggestion => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <suggestion.icon color={theme.colors.accent} size={14} />
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <Text style={styles.timestamp}>
            {format(message.timestamp, 'h:mm a')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <LinearGradient
              colors={[theme.colors.accent, '#1B2A4A']}
              style={styles.headerAvatar}
            >
              <Sparkles color={theme.colors.primaryText} size={24} />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <View style={styles.headerStatusRow}>
                <View style={[styles.statusDot, isTyping && styles.statusDotTyping]} />
                <Text style={styles.headerSubtitle}>
                  {isTyping ? 'Thinking...' : 'Online'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingAvatarSmall}>
                <LinearGradient
                  colors={[theme.colors.accent, '#1B2A4A']}
                  style={styles.avatarGradientSmall}
                >
                  <Sparkles color={theme.colors.primaryText} size={12} />
                </LinearGradient>
              </View>
              <View style={styles.typingIndicator}>
                <Animated.View style={[styles.typingDot, { opacity: typingDot1 }]} />
                <Animated.View style={[styles.typingDot, { opacity: typingDot2 }]} />
                <Animated.View style={[styles.typingDot, { opacity: typingDot3 }]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <GlassBox style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything about your finances..."
              placeholderTextColor={theme.colors.secondaryText}
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSend()}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim()}
            >
              <LinearGradient
                colors={inputText.trim() ? [theme.colors.accent, '#1B2A4A'] : ['rgba(27,42,74,0.06)', 'rgba(27,42,74,0.06)']}
                style={styles.sendButtonGradient}
              >
                <Send color={theme.colors.primaryText} size={20} />
              </LinearGradient>
            </TouchableOpacity>
          </GlassBox>
        </View>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.status.green,
  },
  statusDotTyping: {
    backgroundColor: theme.colors.status.amber,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.secondaryText,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    marginBottom: 16,
  },
  userBubble: {
    alignItems: 'flex-end',
  },
  assistantBubble: {
    flexDirection: 'row',
    gap: 12,
  },
  assistantAvatar: {
    marginTop: 4,
  },
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContent: {
    maxWidth: '80%',
    flexShrink: 1,
  },
  bubble: {
    borderRadius: 20,
    padding: 14,
  },
  userBubbleContent: {
    backgroundColor: theme.colors.accent,
  },
  assistantBubbleContent: {
    backgroundColor: 'rgba(27,42,74,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.secondaryText,
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.secondaryText,
    marginTop: 4,
    marginLeft: 12,
  },
  insightsContainer: {
    marginTop: 12,
    gap: 8,
  },
  insightCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(27,42,74,0.05)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    lineHeight: 18,
  },
  insightAction: {
    marginTop: 8,
  },
  insightActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(62, 146, 204, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(62, 146, 204, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  suggestionText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  typingAvatarSmall: {
    marginTop: 0,
  },
  avatarGradientSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(27,42,74,0.06)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(27,42,74,0.4)',
  },
  inputContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    padding: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.primaryText,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
});
