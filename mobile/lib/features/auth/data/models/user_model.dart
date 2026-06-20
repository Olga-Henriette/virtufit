import 'package:equatable/equatable.dart';

enum UserRole { client, styliste, vendeur, admin }

class UserModel extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final UserRole role;
  final String? avatarUrl;
  final DateTime createdAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.avatarUrl,
    required this.createdAt,
  });

  String get fullName => '$firstName $lastName';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id:        json['id'] as String,
      email:     json['email'] as String,
      firstName: json['firstName'] as String,
      lastName:  json['lastName'] as String,
      role:      UserRole.values.firstWhere(
        (r) => r.name == (json['role'] as String),
        orElse:  () => UserRole.client,
      ),
      avatarUrl: json['avatarUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id':        id,
    'email':     email,
    'firstName': firstName,
    'lastName':  lastName,
    'role':      role.name,
    'avatarUrl': avatarUrl,
    'createdAt': createdAt.toIso8601String(),
  };

  @override
  List<Object?> get props => [id, email, role];
}

class AuthResult extends Equatable {
  final String    accessToken;
  final String    refreshToken;
  final UserModel user;

  const AuthResult({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>;
    return AuthResult(
      accessToken:  data['accessToken']  as String,
      refreshToken: data['refreshToken'] as String,
      user:         UserModel.fromJson(data['user'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [accessToken, user];
}